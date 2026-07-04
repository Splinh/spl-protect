const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cryptoGuard', {
  runAudit: () => ipcRenderer.invoke('run-audit'),
  runOptimize: (action) => ipcRenderer.invoke('run-optimize', action)
});
