import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright';
import { PROTOCOL_VERSION } from '../security.mjs';

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const profile = await mkdtemp(path.join(os.tmpdir(), 'envrille-launcher-test-'));
const screenshots = path.join(desktop, 'test-results', 'launcher');
const packaged = process.env.ENVRILLE_TEST_EXECUTABLE;
const environment = { ...process.env, ENVRILLE_USER_DATA_DIR: profile, ENVRILLE_SERVER_URL: 'http://127.0.0.1:9' };
// The coding host may itself be Electron and expose this flag to Node helpers.
delete environment.ELECTRON_RUN_AS_NODE;
let client;
try {
  await mkdir(screenshots, { recursive: true });
  client = await electron.launch({
    executablePath: packaged || require('electron'),
    args: [...(packaged ? [] : [desktop]), '--windowed'],
    env: environment,
    timeout: 30_000,
  });
  const page = await client.firstWindow();
  page.setDefaultTimeout(10_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('.show-launcher').waitFor();
  await page.locator('.show-opening').waitFor({ state: 'hidden' });
  assert.equal(new URL(page.url()).protocol, 'app:');
  assert.equal(new URL(page.url()).hostname, 'game');
  const bridge = await page.evaluate(() => ({ launcher: window.enVrilleDesktop?.isLauncher, version: window.enVrilleDesktop?.protocolVersion }));
  assert.deepEqual(bridge, { launcher: true, version: PROTOCOL_VERSION });
  for (const name of ['DÉMARRER', 'PARAMÈTRES', 'CRÉDITS', 'QUITTER']) assert.equal(await page.getByRole('button', { name, exact: true }).count(), 1);
  await page.screenshot({ path: path.join(screenshots, 'menu-offline.png') });

  await page.getByRole('button', { name: 'PARAMÈTRES', exact: true }).click();
  const settings = page.locator('.modal[role="dialog"]');
  await settings.waitFor();
  await settings.getByRole('checkbox', { name: 'Tic-tac des 10 dernières secondes', exact: true }).uncheck();
  await page.keyboard.press('Escape');
  await settings.waitFor({ state: 'hidden' });
  const stored = JSON.parse(await readFile(path.join(profile, 'settings.json'), 'utf8'));
  assert.equal(stored.preferences.show.tickEnabled, false);

  await page.locator('.show-menu-language select').selectOption('en');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  await page.locator('.show-menu-language select').selectOption('fr');
  await page.getByRole('button', { name: 'CRÉDITS', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'DÉMARRER', exact: true }).click();
  await page.getByRole('heading', { name: 'Impossible de rejoindre le serveur EN VRILLE !', exact: true }).waitFor();
  assert.equal(new URL(page.url()).protocol, 'app:');
  assert.equal(new URL(page.url()).hostname, 'game');
  assert.equal(client.windows().length, 1);
  await page.getByRole('button', { name: 'RÉESSAYER', exact: true }).waitFor();
  await page.screenshot({ path: path.join(screenshots, 'server-unavailable.png') });
  await page.getByRole('button', { name: 'Retour au menu', exact: true }).click();
  await page.getByRole('button', { name: 'DÉMARRER', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(`Windows launcher verified offline: local menu, settings persistence, FR/EN, credits, unavailable server, return. Screenshots: ${screenshots}`);
} finally {
  await client?.close().catch(() => {});
  const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(profile));
  if (!relative.startsWith('envrille-launcher-test-') || relative.includes(path.sep)) throw new Error('Unexpected test profile path.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
