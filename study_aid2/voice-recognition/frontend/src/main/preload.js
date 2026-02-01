const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (content, filename) => ipcRenderer.invoke('save-file', { content, filename }),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
