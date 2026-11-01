import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { register } from 'tsx/esm/api';
import { _electron as electron } from 'playwright';

register();
const { createGameServer } = await import('../../api/src/server.ts');
const { MemoryStore } = await import('../../api/src/store.ts');
const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packaged = process.argv.includes('--packaged');
const evidence = path.join(desktop, 'release', 'test-evidence');
await mkdir(evidence, { recursive: true });
const userData = await mkdtemp(path.join(os.tmpdir(), 'en-vrille-desktop-'));
const errors = [];
const server = await createGameServer({
  store: new MemoryStore(),
  publicUrl: 'https://envrille.erubis.fr',
  sessionSecret: 'desktop-integration-only-secret-long-enough-for-tests',
  autoTick: false,
  logger: error => errors.push(String(error)),
});
const serverUrl = await server.listen(0, '127.0.0.1');
let application;
try {
  const executablePath = packaged ? path.join(desktop, 'release', 'win-unpacked', 'EN-VRILLE.exe') : (await import('electron')).default;
  const env = { ...process.env, ENVRILLE_USER_DATA_DIR: userData, ENVRILLE_SERVER_URL: serverUrl };
  delete env.ELECTRON_RUN_AS_NODE;
  application = await electron.launch({ executablePath, args: packaged ? [] : [desktop], env, timeout: 45000 });
  const page = await application.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /Content Security Policy|Refused to/.test(message.text())) errors.push(message.text()); });
  await page.waitForURL('app://game/');
  await page.getByRole('button', { name: 'Créer une partie', exact: true }).first().waitFor();
  await page.getByRole('dialog', { name: 'Générique EN VRILLE' }).waitFor({ state: 'hidden', timeout: 6000 });
  await page.screenshot({ path: path.join(evidence, 'windows-local-menu.png') });
  const metadata = await page.evaluate(() => ({
    serverUrl: window.enVrilleDesktop?.serverUrl,
    protocolVersion: window.enVrilleDesktop?.protocolVersion,
    node: typeof window.require,
    process: typeof window.process,
  }));
  assert.equal(metadata.serverUrl, serverUrl);
  assert.equal(metadata.protocolVersion, 1);
  assert.equal(metadata.node, 'undefined');
  assert.equal(metadata.process, 'undefined');
  assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen()), true);
  await page.evaluate(() => window.enVrilleDesktop.setFullscreen(false));
  assert.equal(await page.evaluate(() => window.enVrilleDesktop.isFullscreen()), false);
  await page.keyboard.press('F11');
  await page.waitForFunction(async () => window.enVrilleDesktop.isFullscreen());
  const localMedia = await page.evaluate(async () => ({
    status: (await fetch('app://game/media/scene-01.svg')).status,
    html: (await fetch('app://game/')).headers.get('Content-Security-Policy'),
  }));
  assert.equal(localMedia.status, 200);
  assert.match(localMedia.html, /script-src 'self'/);
  await assert.rejects(() => page.evaluate(() => window.enVrilleDesktop.setServerUrl('javascript:alert(1)')));
  await assert.rejects(() => page.evaluate(() => window.enVrilleDesktop.openExternal('https://untrusted.example/')));

  await page.getByRole('button', { name: 'Créer une partie', exact: true }).first().click();
  await page.getByRole('button', { name: 'Préparer le programme', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('textbox', { name: 'Ton pseudo', exact: true }).fill('Hôte PC');
  await page.getByRole('button', { name: 'Créer un salon', exact: true }).click();
  await page.locator('[data-testid="phase"][data-phase="lobby"]').waitFor({ timeout: 20000 });
  await page.locator('.show-stage').waitFor();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const sceneBounds = await page.locator('.show-stage').evaluate(element => ({
    bottom: element.getBoundingClientRect().bottom,
    viewport: window.innerHeight,
    pageHeight: document.documentElement.scrollHeight,
  }));
  assert.ok(sceneBounds.bottom <= sceneBounds.viewport + 1, 'The TV scene must fit the native fullscreen viewport.');
  assert.ok(sceneBounds.pageHeight <= sceneBounds.viewport + 1, 'The native TV screen must not scroll the page.');
  const code = (await page.getByTestId('room-code').first().innerText()).trim();
  assert.match(code, /^[A-Z0-9]{6}$/);
  assert.match(await page.locator('.invite-url').first().getAttribute('href'), new RegExp(`^https://envrille\\.erubis\\.fr/.*room=${code}`));
  await page.screenshot({ path: path.join(evidence, 'windows-local-lobby.png') });
  await page.reload();
  await page.locator('[data-testid="phase"][data-phase="lobby"]').waitFor({ timeout: 20000 });
  assert.equal((await page.getByTestId('room-code').first().innerText()).trim(), code);

  // Changing the saved server must refresh preload metadata and CSP on the next load.
  await page.evaluate(() => window.enVrilleDesktop.setServerUrl('http://127.0.0.1:1'));
  await page.reload();
  await page.waitForFunction(() => window.enVrilleDesktop?.serverUrl === 'http://127.0.0.1:1');
  assert.equal(JSON.parse(await readFile(path.join(userData, 'settings.json'), 'utf8')).serverUrl, 'http://127.0.0.1:1');
  await page.locator('.desktop-connection').first().waitFor({ timeout: 20000 });
  await page.evaluate(url => window.enVrilleDesktop.setServerUrl(url), serverUrl);
  await page.reload();
  await page.locator('[data-testid="phase"][data-phase="lobby"]').waitFor({ timeout: 20000 });
  assert.equal((await page.getByTestId('room-code').first().innerText()).trim(), code);
  assert.deepEqual(errors, []);
  const closed = application.waitForEvent('close');
  await page.evaluate(() => window.enVrilleDesktop.quit()).catch(() => {});
  await closed;
  application = undefined;
  // A second real process must recover the desktop host session as well.
  application = await electron.launch({ executablePath, args: packaged ? [] : [desktop], env, timeout: 45000 });
  const relaunched = await application.firstWindow();
  await relaunched.locator('[data-testid="phase"][data-phase="lobby"]').waitFor({ timeout: 20000 });
  assert.equal((await relaunched.getByTestId('room-code').first().innerText()).trim(), code);
  const secondClosed = application.waitForEvent('close');
  await relaunched.evaluate(() => window.enVrilleDesktop.quit()).catch(() => {});
  await secondClosed;
  application = undefined;
  console.log(`Windows ${packaged ? 'packaged executable' : 'Electron source'} passed: local menu/media, strict CSP, isolated renderer, fullscreen, room creation, persisted reconnection, server change, clean quit and process relaunch.`);
  console.log(`Evidence: ${evidence}`);
} finally {
  if (application) await application.close();
  await server.close();
}
