export interface DesktopBridge {
  platform: string;
  protocolVersion: number;
  version: string;
  serverUrl: string;
  setServerUrl: (url: string) => Promise<string>;
  setFullscreen: (fullscreen: boolean) => Promise<boolean>;
  isFullscreen?: () => Promise<boolean>;
  onFullscreenChange?: (listener: (fullscreen: boolean) => void) => () => void;
  quit: () => Promise<void>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window { enVrilleDesktop?: DesktopBridge; }
}

export const desktop = window.enVrilleDesktop;
export const isDesktop = Boolean(desktop);
export const serverOrigin = desktop?.serverUrl.replace(/\/+$/, "") || "";

/** Keep packaged graphics local; only multiplayer data and uploaded media use the server. */
export function serverResource(path: string): string {
  if (!isDesktop || /^(?:https?:|data:|blob:|app:)/i.test(path)) return path;
  if (/^\/media\/scene-(?:0[1-9]|1[0-9]|20)\.svg$/.test(path)) return path;
  return /^\/(?:api|media)(?:\/|$)/.test(path) ? `${serverOrigin}${path}` : path;
}

export function serverFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(serverResource(path), options);
}

export function validateServerUrl(value: string): string {
  if (value.length > 2048) throw new Error("L’adresse du serveur est trop longue.");
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("Saisissez une adresse complète, par exemple https://envrille.erubis.fr."); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error("Utilisez une adresse HTTP ou HTTPS sans identifiants, paramètres ou chemin.");
  }
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error("Utilisez HTTPS pour le serveur en ligne. HTTP est disponible pour les tests sur ce PC.");
  }
  return url.origin;
}
