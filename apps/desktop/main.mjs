import { app, BrowserWindow, dialog, ipcMain, net, protocol, session, shell } from 'electron';
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { contentSecurityPolicy, DEFAULT_SERVER_URL, isLocalDocument, PROTOCOL_VERSION, resolveLocalAsset, validateExternalUrl, validateServerUrl } from './security.mjs';
import { initializeSteam } from './steam.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
if (process.env.ENVRILLE_USER_DATA_DIR) {
  mkdirSync(process.env.ENVRILLE_USER_DATA_DIR, { recursive: true });
  app.setPath('userData', path.resolve(process.env.ENVRILLE_USER_DATA_DIR));
}
app.setAppUserModelId('fr.erubis.envrille');
let window;
let serverUrl = DEFAULT_SERVER_URL;
let steam;

function log(message) {
  try {
    const folder = path.join(app.getPath('userData'), 'logs');
    mkdirSync(folder, { recursive: true });
    appendFileSync(path.join(folder, 'desktop.log'), `${new Date().toISOString()} ${String(message).replace(/[\r\n]+/g, ' ')}\n`, 'utf8');
  } catch { /* Logging never prevents startup. */ }
}

function settingsPath() { return path.join(app.getPath('userData'), 'settings.json'); }
function readServer() {
  const explicit = process.env.ENVRILLE_SERVER_URL || process.argv.find(value => value.startsWith('--server-url='))?.slice('--server-url='.length);
  if (explicit) return validateServerUrl(explicit);
  try { return validateServerUrl(JSON.parse(readFileSync(settingsPath(), 'utf8')).serverUrl); } catch { return DEFAULT_SERVER_URL; }
}
function trustedSender(event) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !isLocalDocument(event.senderFrame.url)) throw new Error('Émetteur non autorisé.');
}

function createWindow() {
  window = new BrowserWindow({
    title: 'EN VRILLE !', width: 1600, height: 900, minWidth: 960, minHeight: 600,
    backgroundColor: '#111113', autoHideMenuBar: true, show: false,
    fullscreen: !process.argv.includes('--windowed'),
    icon: path.join(here, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(here, 'preload.cjs'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      webSecurity: true, allowRunningInsecureContent: false, webviewTag: false,
    },
  });
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, target) => { if (!isLocalDocument(target)) event.preventDefault(); });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.on('render-process-gone', (_event, details) => {
    log(`Renderer stopped: ${details.reason}`);
    if (details.reason !== 'clean-exit') dialog.showErrorBox('EN VRILLE !', 'L’affichage du jeu a été interrompu. Ferme puis relance EN VRILLE !. Tes sessions restent conservées.');
  });
  window.webContents.on('did-fail-load', (_event, code, description, _url, isMainFrame) => { if (isMainFrame) log(`Local UI failed: ${code} ${description}`); });
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { event.preventDefault(); window.setFullScreen(!window.isFullScreen()); }
    if (input.type === 'keyDown' && input.key === 'Escape' && window.isFullScreen()) window.setFullScreen(false);
  });
  window.once('ready-to-show', () => window.show());
  window.on('enter-full-screen', () => window?.webContents.send('desktop:fullscreen-changed', true));
  window.on('leave-full-screen', () => window?.webContents.send('desktop:fullscreen-changed', false));
  window.on('closed', () => { window = undefined; });
  void window.loadURL('app://game/');
}

const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(async () => {
    serverUrl = readServer();
    log(`EN VRILLE ${app.getVersion()}, protocol ${PROTOCOL_VERSION}; local assets; starting.`);
    steam = await initializeSteam({ logger: log });
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    protocol.handle('app', async request => {
      try {
        const asset = resolveLocalAsset(path.join(here, 'renderer'), request.url);
        const response = await net.fetch(pathToFileURL(asset).href);
        const headers = new Headers(response.headers);
        headers.set('Content-Security-Policy', contentSecurityPolicy(serverUrl));
        headers.set('X-Content-Type-Options', 'nosniff');
        return new Response(response.body, { status: response.status, headers });
      } catch { return new Response('Ressource locale introuvable.', { status: 404 }); }
    });
    ipcMain.on('desktop:metadata', event => {
      try { trustedSender(event); event.returnValue = { version: app.getVersion(), serverUrl, protocolVersion: PROTOCOL_VERSION }; }
      catch { event.returnValue = {}; }
    });
    ipcMain.handle('desktop:set-server', (event, value) => {
      trustedSender(event);
      const next = validateServerUrl(value);
      mkdirSync(path.dirname(settingsPath()), { recursive: true });
      writeFileSync(settingsPath() + '.tmp', JSON.stringify({ serverUrl: next }, null, 2), 'utf8');
      renameSync(settingsPath() + '.tmp', settingsPath());
      serverUrl = next;
      return next;
    });
    ipcMain.handle('desktop:fullscreen', (event, value) => { trustedSender(event); if (typeof value !== 'boolean') throw new Error('État invalide.'); window.setFullScreen(value); return window.isFullScreen(); });
    ipcMain.handle('desktop:is-fullscreen', event => { trustedSender(event); return window.isFullScreen(); });
    ipcMain.handle('desktop:quit', event => { trustedSender(event); setImmediate(() => app.quit()); });
    ipcMain.handle('desktop:open-external', (event, value) => { trustedSender(event); return shell.openExternal(validateExternalUrl(value, serverUrl)); });
    createWindow();
  }).catch(error => { log(`Startup failed: ${error.message}`); dialog.showErrorBox('EN VRILLE ! — démarrage', String(error.message)); app.quit(); });
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => steam?.shutdown());
  process.on('uncaughtException', error => { log(`Uncaught: ${error.stack}`); dialog.showErrorBox('EN VRILLE !', 'Une erreur inattendue est survenue. Consulte le journal du jeu puis relance-le.'); app.quit(); });
  process.on('unhandledRejection', error => log(`Unhandled promise: ${error instanceof Error ? error.stack : error}`));
}
