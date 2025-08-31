// Preload - expose a minimal, safe API for renderer to request saves
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // save production record (returns a promise)
  saveUretim: (data) => ipcRenderer.invoke('save-uretim', data),
  listUretim: () => ipcRenderer.invoke('list-uretim'),
  savePaketleme: (data) => ipcRenderer.invoke('save-paketleme', data),
  listPaketleme: () => ipcRenderer.invoke('list-paketleme'),
  // product (urun)
  saveUrun: (data) => ipcRenderer.invoke('save-urun', data),
  listUrun: () => ipcRenderer.invoke('list-urun'),
  // operasyon (operations)
  saveOperasyon: (data) => ipcRenderer.invoke('save-operasyon', data),
  listOperasyon: () => ipcRenderer.invoke('list-operasyon'),
  // siparis (orders)
  saveSiparis: (data) => ipcRenderer.invoke('save-siparis', data),
  listSiparis: () => ipcRenderer.invoke('list-siparis'),
  importSiparis: (filePaths) => ipcRenderer.invoke('import-siparis', filePaths),
  previewSiparis: () => ipcRenderer.invoke('preview-siparis')
  ,
  // deletes by savedAt timestamp
  deleteUretim: (savedAt) => ipcRenderer.invoke('delete-uretim', savedAt),
  deletePaketleme: (savedAt) => ipcRenderer.invoke('delete-paketleme', savedAt),
  deleteUrun: (savedAt) => ipcRenderer.invoke('delete-urun', savedAt),
  deleteOperasyon: (savedAt) => ipcRenderer.invoke('delete-operasyon', savedAt),
  deleteSiparis: (savedAt) => ipcRenderer.invoke('delete-siparis', savedAt)
});
