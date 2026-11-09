const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopAPI', {
  savePDF: (suggestedName) => ipcRenderer.invoke('save-pdf', suggestedName),
})
