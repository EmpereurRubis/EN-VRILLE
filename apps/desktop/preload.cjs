const { contextBridge, ipcRenderer } = require('electron');
const metadata = ipcRenderer.sendSync('desktop:metadata');
contextBridge.exposeInMainWorld('enVrilleDesktop', Object.freeze({
  platform: process.platform,
  protocolVersion: metadata.protocolVersion,
  version: metadata.version,
  serverUrl: metadata.serverUrl,
  isLauncher: metadata.isLauncher,
  locale: metadata.locale,
  preferences: metadata.preferences,
  startGame: locale => ipcRenderer.invoke('desktop:start-game', locale),
  returnToLauncher: () => ipcRenderer.invoke('desktop:return-launcher'),
  setLanguage: locale => ipcRenderer.invoke('desktop:set-language', locale),
  setPreferences: patch => ipcRenderer.invoke('desktop:set-preferences', patch),
  getWindowSettings: () => ipcRenderer.invoke('desktop:window-settings'),
  setResolution: (width, height) => ipcRenderer.invoke('desktop:set-resolution', width, height),
  setServerUrl: url => ipcRenderer.invoke('desktop:set-server', url),
  setFullscreen: enabled => ipcRenderer.invoke('desktop:fullscreen', enabled),
  isFullscreen: () => ipcRenderer.invoke('desktop:is-fullscreen'),
  onFullscreenChange: listener => {
    if (typeof listener !== 'function') throw new TypeError('Écouteur invalide.');
    const callback = (_event, fullscreen) => listener(Boolean(fullscreen));
    ipcRenderer.on('desktop:fullscreen-changed', callback);
    return () => ipcRenderer.removeListener('desktop:fullscreen-changed', callback);
  },
  quit: () => ipcRenderer.invoke('desktop:quit'),
  openExternal: url => ipcRenderer.invoke('desktop:open-external', url),
}));
