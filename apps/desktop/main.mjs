import { app, BrowserWindow, dialog, ipcMain, net, protocol, screen, session, shell } from 'electron';
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { contentSecurityPolicy, DEFAULT_SERVER_URL, isLocalDocument, isPlatformDocument, PROTOCOL_VERSION, resolveLocalAsset, validateExternalUrl, validateServerUrl } from './security.mjs';
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
let locale = 'fr';
let preferences = {};
let windowSettings = { fullscreen: true, width: 1600, height: 900 };
let loadingPlatform = false;

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
function trustedSender(event, localOnly = false) {
  const origin = event.senderFrame?.url;
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame ||
      !(isLocalDocument(origin) || (!localOnly && isPlatformDocument(origin, serverUrl)))) throw new Error('Émetteur non autorisé.');
}
function saveSettings() {
  mkdirSync(path.dirname(settingsPath()), { recursive: true });
  writeFileSync(settingsPath() + '.tmp', JSON.stringify({ serverUrl, locale, preferences, window: windowSettings }, null, 2), 'utf8');
  renameSync(settingsPath() + '.tmp', settingsPath());
}
function setLocale(value) {
  if (!['fr', 'en'].includes(value)) throw new Error('Langue invalide.');
  locale = value; saveSettings(); return locale;
}
async function showLauncher(error) {
  loadingPlatform = false;
  const target = new URL('app://game/'); target.searchParams.set('lang', locale);
  if (error) target.searchParams.set('connectionError', error);
  await window.loadURL(target.href);
}
function sanitizePreferences(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Préférences invalides.');
  const next = { ...preferences };
  if (['light', 'dark', 'system'].includes(patch.theme)) next.theme = patch.theme;
  if (typeof patch.reduced === 'boolean') next.reduced = patch.reduced;
  if (patch.show && typeof patch.show === 'object') {
    const show = { ...(next.show || {}) };
    for (const key of ['master', 'music', 'voice', 'sfx']) if (Number.isFinite(patch.show[key])) show[key] = Math.max(0, Math.min(1, patch.show[key]));
    for (const key of ['musicEnabled', 'voiceEnabled', 'sfxEnabled', 'subtitles', 'reducedMotion']) if (typeof patch.show[key] === 'boolean') show[key] = patch.show[key];
    if (['slow', 'normal', 'fast'].includes(patch.show.textSpeed)) show.textSpeed = patch.show.textSpeed;
    next.show = show;
  }
  return next;
}

function createWindow() {
  window = new BrowserWindow({
    title: 'EN VRILLE !', width: windowSettings.width, height: windowSettings.height, minWidth: 960, minHeight: 600, useContentSize: true,
    backgroundColor: '#111113', autoHideMenuBar: true, show: false,
    fullscreen: !process.argv.includes('--windowed') && windowSettings.fullscreen,
    icon: path.join(here, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(here, 'preload.cjs'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      webSecurity: true, allowRunningInsecureContent: false, webviewTag: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, target) => { if (!isLocalDocument(target) && !isPlatformDocument(target, serverUrl)) event.preventDefault(); });
  window.webContents.on('will-redirect', (event, target) => { if (!isPlatformDocument(target, serverUrl) && !isLocalDocument(target)) event.preventDefault(); });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.on('render-process-gone', (_event, details) => {
    log(`Renderer stopped: ${details.reason}`);
    if (details.reason !== 'clean-exit') dialog.showErrorBox('EN VRILLE !', 'L’affichage du jeu a été interrompu. Ferme puis relance EN VRILLE !. Tes sessions restent conservées.');
  });
  window.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    log(`Display failed: ${code} ${description}`);
    if (loadingPlatform || isPlatformDocument(url, serverUrl)) void showLauncher('network').catch(error => log(error.message));
  });
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { event.preventDefault(); window.setFullScreen(!window.isFullScreen()); }
    if (input.type === 'keyDown' && input.key === 'Escape' && window.isFullScreen()) window.setFullScreen(false);
  });
  window.once('ready-to-show', () => window.show());
  window.on('enter-full-screen', () => { windowSettings.fullscreen = true; saveSettings(); window?.webContents.send('desktop:fullscreen-changed', true); });
  window.on('leave-full-screen', () => { windowSettings.fullscreen = false; saveSettings(); window?.webContents.send('desktop:fullscreen-changed', false); });
  window.on('close', () => { if (window && !window.isFullScreen() && !window.isMaximized()) { const bounds = window.getContentBounds(); windowSettings.width = bounds.width; windowSettings.height = bounds.height; saveSettings(); } });
  window.on('closed', () => { window = undefined; });
  void showLauncher();
}

const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(async () => {
    serverUrl = readServer();
    try { const stored = JSON.parse(readFileSync(settingsPath(), 'utf8')); locale = stored.locale === 'en' ? 'en' : 'fr'; preferences = sanitizePreferences(stored.preferences || {}); } catch { /* Fresh installation. */ }
    try { const saved = JSON.parse(readFileSync(settingsPath(), 'utf8')).window; if (saved && typeof saved.fullscreen === 'boolean' && Number.isInteger(saved.width) && Number.isInteger(saved.height) && saved.width >= 960 && saved.width <= 3840 && saved.height >= 600 && saved.height <= 2160) windowSettings = saved; } catch { /* Default display settings. */ }
    log(`EN VRILLE ${app.getVersion()}, protocol ${PROTOCOL_VERSION}; offline launcher; starting.`);
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
      try { trustedSender(event); event.returnValue = { version: app.getVersion(), serverUrl, protocolVersion: PROTOCOL_VERSION, isLauncher: isLocalDocument(event.senderFrame.url), locale, preferences }; }
      catch { event.returnValue = {}; }
    });
    ipcMain.handle('desktop:set-server', (event, value) => {
      trustedSender(event, true);
      const next = validateServerUrl(value);
      serverUrl = next;
      saveSettings();
      return next;
    });
    ipcMain.handle('desktop:start-game', async (event, language) => {
      trustedSender(event, true); setLocale(language || locale);
      try {
        loadingPlatform = true;
        const response = await net.fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('network');
        const health = await response.json();
        if (health.protocolVersion !== PROTOCOL_VERSION) { await showLauncher('protocol'); return false; }
        const target = new URL(serverUrl); target.searchParams.set('lang', locale); target.searchParams.set('desktop', '1');
        await window.loadURL(target.href); loadingPlatform = false; return true;
      } catch (error) { log(`Platform unavailable: ${error.message}`); await showLauncher('network'); return false; }
    });
    ipcMain.handle('desktop:return-launcher', async event => { trustedSender(event); await showLauncher(); });
    ipcMain.handle('desktop:set-language', (event, language) => { trustedSender(event); return setLocale(language); });
    ipcMain.handle('desktop:set-preferences', (event, patch) => { trustedSender(event); preferences = sanitizePreferences(patch); saveSettings(); return preferences; });
    ipcMain.handle('desktop:window-settings', event => { trustedSender(event); return { fullscreen: window.isFullScreen(), ...window.getContentBounds() }; });
    ipcMain.handle('desktop:set-resolution', async (event, width, height) => {
      trustedSender(event);
      if (![[1280, 720], [1600, 900], [1920, 1080]].some(size => size[0] === width && size[1] === height)) throw new Error('Résolution invalide.');
      if (window.isFullScreen()) { const changed = new Promise(resolve => window.once('leave-full-screen', resolve)); window.setFullScreen(false); await changed; }
      const area = screen.getDisplayMatching(window.getBounds()).workAreaSize;
      const outer = window.getBounds(), content = window.getContentBounds();
      const factor = Math.min(1, (area.width - (outer.width - content.width)) / width, (area.height - (outer.height - content.height)) / height);
      window.setContentSize(Math.floor(width * factor), Math.floor(height * factor)); window.center();
      windowSettings = { fullscreen: false, width: Math.floor(width * factor), height: Math.floor(height * factor) }; saveSettings();
      return { width: Math.floor(width * factor), height: Math.floor(height * factor) };
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
