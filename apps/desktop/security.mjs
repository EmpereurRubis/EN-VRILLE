import path from 'node:path';

export const DEFAULT_SERVER_URL = 'https://envrille.erubis.fr';
export const LOCAL_ORIGIN = 'app://game';
export const PROTOCOL_VERSION = 2;

export function isPlatformDocument(input, serverUrl) {
  try { const url = new URL(input); return !url.username && !url.password && url.origin === validateServerUrl(serverUrl); }
  catch { return false; }
}

export function validateServerUrl(input) {
  if (typeof input !== 'string' || input.length > 2048) throw new Error('Adresse du serveur invalide.');
  const url = new URL(input.trim());
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('Utilise une origine HTTP(S), sans chemin, identifiants ni paramètres.');
  }
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('HTTPS est requis, sauf pour un serveur local.');
  }
  return url.origin;
}

export function isLocalDocument(input) {
  try {
    const url = new URL(input);
    return url.protocol === 'app:' && url.hostname === 'game' && !url.username && !url.password && !url.port;
  } catch { return false; }
}

export function resolveLocalAsset(root, input) {
  if (!isLocalDocument(input)) throw new Error('Origine locale refusée.');
  const url = new URL(input);
  const decoded = decodeURIComponent(url.pathname);
  if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').some(part => part === '..')) throw new Error('Chemin refusé.');
  const target = path.resolve(root, '.' + (decoded === '/' ? '/index.html' : decoded));
  const relative = path.relative(path.resolve(root), target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Chemin refusé.');
  return target;
}

export function contentSecurityPolicy(serverUrl) {
  const server = validateServerUrl(serverUrl);
  const socket = server.replace(/^http/, 'ws');
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${server} ${socket}`,
    `img-src 'self' data: blob: ${server}`,
    `media-src 'self' blob: ${server}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function validateExternalUrl(input, serverUrl) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.origin !== validateServerUrl(serverUrl)) throw new Error('Lien externe non autorisé.');
  return url.href;
}
