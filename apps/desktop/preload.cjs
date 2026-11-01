const { contextBridge, ipcRenderer } = require('electron');
const metadata = ipcRenderer.sendSync('desktop:metadata');
contextBridge.exposeInMainWorld('enVrilleDesktop', Object.freeze({
  platform: process.platform,
  protocolVersion: metadata.protocolVersion,
  version: metadata.version,
  serverUrl: metadata.serverUrl,
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
