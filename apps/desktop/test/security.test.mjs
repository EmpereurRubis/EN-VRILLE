import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { contentSecurityPolicy, isLocalDocument, resolveLocalAsset, validateExternalUrl, validateServerUrl } from '../security.mjs';
import { initializeSteam } from '../steam.mjs';

test('server origins reject credentials, non-HTTP schemes and insecure remote servers', () => {
  assert.equal(validateServerUrl('https://envrille.erubis.fr/'), 'https://envrille.erubis.fr');
  assert.equal(validateServerUrl('http://127.0.0.1:3001'), 'http://127.0.0.1:3001');
  for (const value of ['javascript:alert(1)', 'file:///etc/passwd', 'https://user:secret@example.com', 'http://example.com', 'https://example.com/path', 'https://example.com?token=secret', 'https://example.com#secret']) assert.throws(() => validateServerUrl(value));
});

test('local protocol confines assets to the renderer directory', () => {
  const root = path.resolve('local-renderer');
  assert.equal(resolveLocalAsset(root, 'app://game/'), path.join(root, 'index.html'));
  assert.equal(resolveLocalAsset(root, 'app://game/assets/a.js'), path.join(root, 'assets', 'a.js'));
  for (const value of ['app://evil/index.html', 'file:///index.html', 'app://game/%2e%2e%2fsecret', 'app://game/a%5c..%5csecret', 'app://game/%00secret', 'app://user@game/']) assert.throws(() => resolveLocalAsset(root, value));
  assert.equal(isLocalDocument('https://envrille.erubis.fr'), false);
});

test('CSP restricts connections and external links to the selected backend', () => {
  const csp = contentSecurityPolicy('https://envrille.erubis.fr');
  assert.match(csp, /connect-src 'self' https:\/\/envrille\.erubis\.fr wss:\/\/envrille\.erubis\.fr/);
  assert.match(csp, /script-src 'self';/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.equal(validateExternalUrl('https://envrille.erubis.fr/?room=ABC123', 'https://envrille.erubis.fr'), 'https://envrille.erubis.fr/?room=ABC123');
  assert.throws(() => validateExternalUrl('https://elsewhere.example', 'https://envrille.erubis.fr'));
});

test('Steam is optional and exposes no unimplemented capabilities', async () => {
  const steam = await initializeSteam();
  assert.equal(steam.available, false);
  assert.equal(steam.identity, null);
  assert.deepEqual(steam.capabilities, { overlay: false, achievements: false, statistics: false });
  assert.doesNotThrow(() => steam.shutdown());
});
