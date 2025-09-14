// Preload - expose a minimal, safe API for renderer to request saves
const { contextBridge, ipcRenderer } = require('electron');

// Main API - only keep handlers that are actually implemented in main.js
const api = {
  // production records
  saveUretim: (data) => ipcRenderer.invoke('save-uretim', data),
  listUretim: () => ipcRenderer.invoke('list-uretim'),
  deleteUretim: (id) => ipcRenderer.invoke('delete-uretim', id),
  
  // operations
  saveOperasyon: (data) => ipcRenderer.invoke('save-operasyon', data),
  listOperasyon: () => ipcRenderer.invoke('list-operasyon'),
  deleteOperasyon: (id) => ipcRenderer.invoke('delete-operasyon', id),
  
  // products
  saveProduct: (data) => ipcRenderer.invoke('save-product', data),
  listProducts: () => ipcRenderer.invoke('list-products'),
  
  // cycle times
  saveCycleTime: (data) => ipcRenderer.invoke('save-cycle-time', data),
  listCycleTimes: () => ipcRenderer.invoke('list-cycle-times'),
  deleteCycleTime: (id) => ipcRenderer.invoke('delete-cycle-time', id),
  
  // operation types
  getOperationTypes: (onlyActive = false) => ipcRenderer.invoke('get-operation-types', onlyActive),
  
  // staging operations for CSV batch processing
  stagingAdd: (type, record) => ipcRenderer.invoke('staging-add', type, record),
  stagingList: (type) => ipcRenderer.invoke('staging-list', type),
  stagingClear: (type) => ipcRenderer.invoke('staging-clear', type),
  stagingDelete: (type, stagedId) => ipcRenderer.invoke('staging-delete', type, stagedId),
  stagingUpload: (type) => ipcRenderer.invoke('staging-upload', type)
};

// Expose both 'api' and 'electronAPI' for consistency
contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('electronAPI', api);
