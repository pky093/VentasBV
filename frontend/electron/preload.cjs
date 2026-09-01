const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  printTicket: (htmlContent) => ipcRenderer.invoke('print-ticket', htmlContent),
});
