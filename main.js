const { app, BrowserWindow } = require('electron');
const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
const os = require('os');

// API Configuration - HTTPS backend için
const API_BASE_URL = 'https://localhost:7287/api';

// Configure axios to ignore self-signed certificates for localhost
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// HTTPS localhost için Axios SSL konfigürasyonu
axios.defaults.httpsAgent = new (require('https').Agent)({
  rejectUnauthorized: false,
  checkServerIdentity: () => undefined
});

// Axios global ayarları
axios.defaults.timeout = 10000; // 10 saniye timeout
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Axios retry logic - Network hatalarında yeniden deneme
axiosRetry(axios, {
  retries: 3, // 3 kez dene
  retryDelay: (retryCount) => {
    console.log(`🔄 API Retry attempt ${retryCount}`);
    return axiosRetry.exponentialDelay(retryCount); // Exponential backoff
  },
  retryCondition: (error) => {
    // Network errors veya 5xx server errors'da retry yap
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response && error.response.status >= 500);
  },
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`⚠️ API Retry ${retryCount}: ${error.message} - ${requestConfig.url}`);
  }
});

// Request interceptor - API çağrılarını loglama
axios.interceptors.request.use(
  (config) => {
    const timestamp = new Date().toISOString();
    console.log(`🔗 API Request [${timestamp}]: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Request timing için başlangıç zamanını kaydet
    config.metadata = { startTime: Date.now() };
    
    return config;
  },
  (error) => {
    console.error('❌ Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - API yanıtlarını loglama ve error handling
axios.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata.startTime;
    const timestamp = new Date().toISOString();
    
    console.log(`✅ API Response [${timestamp}]: ${response.status} ${response.config.url} (${duration}ms)`);
    
    // Response size logla (debug için)
    const dataSize = JSON.stringify(response.data).length;
    if (dataSize > 10000) { // 10KB'dan büyükse warn et
      console.warn(`⚠️ Large API Response: ${(dataSize / 1024).toFixed(1)}KB from ${response.config.url}`);
    }
    
    return response;
  },
  (error) => {
    const timestamp = new Date().toISOString();
    const duration = error.config?.metadata ? Date.now() - error.config.metadata.startTime : 'unknown';
    
    if (error.response) {
      // Server responded with error status
      console.error(`❌ API Error [${timestamp}]: ${error.response.status} ${error.config?.url} (${duration}ms)`);
      console.error(`   Error Data:`, error.response.data);
    } else if (error.request) {
      // Network error - no response received
      console.error(`❌ Network Error [${timestamp}]: ${error.message} - ${error.config?.url} (${duration}ms)`);
    } else {
      // Other error
      console.error(`❌ Request Setup Error [${timestamp}]:`, error.message);
    }
    
    return Promise.reject(error);
  }
);

// Electron Cache Best Practices - Kalıcı Çözüm
// path, fs, os zaten üstte tanımlandı

// 1. Cache dizinini özel konuma taşı
const customCacheDir = path.join(os.tmpdir(), 'arifk-takip-cache');
try {
  if (!fs.existsSync(customCacheDir)) {
    fs.mkdirSync(customCacheDir, { recursive: true, mode: 0o777 });
  }
  app.setPath('userData', customCacheDir);
  console.log('✅ Custom cache directory created:', customCacheDir);
} catch (error) {
  console.warn('⚠️ Cache directory setup warning:', error.message);
}

// 2. Windows cache problemleri için Chromium flags
app.commandLine.appendSwitch('--disable-gpu-cache');
app.commandLine.appendSwitch('--disk-cache-size', '1');
app.commandLine.appendSwitch('--media-cache-size', '1');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');

// 3. Performance vs Error balance
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--disable-gpu-sandbox');

// 4. Log level düşür (cache hatalarını gizle)
app.commandLine.appendSwitch('--log-level', '2'); // Sadece FATAL hatalar

// 5. Cache temizleme fonksiyonu
function clearAppCache() {
  try {
    const session = require('electron').session;
    if (session && session.defaultSession) {
      session.defaultSession.clearCache();
      session.defaultSession.clearStorageData();
      console.log('✅ Cache cleared successfully');
    }
  } catch (error) {
    console.warn('⚠️ Cache clear warning:', error.message);
  }
}

// 6. Uygulama kapanırken cache temizle
app.on('before-quit', () => {
  clearAppCache();
});

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'arifk.co - Takip Sistemi',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // SSL certificate sorununu çözmek için
      backgroundThrottling: false, // Background throttling'i kapat
      offscreen: false, // Offscreen rendering'i kapat
      enableRemoteModule: false, // Güvenlik için
      spellcheck: false // Spell check'i kapat (performans)
    },
    show: false // Önce gizli başlat, ready olunca göster
  })

  // Pencere hazır olduğunda göster
  win.once('ready-to-show', () => {
    win.show();
    console.log('✅ Window is ready and shown');
  });

  // F12 ile DevTools açma
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(async () => {
  // Cache temizlemeyi kaldırdık - performans için
  // try {
  //   const { session } = require('electron');
  //   await session.defaultSession.clearCache();
  //   console.log('✅ Cache cleared successfully');
  // } catch (error) {
  //   console.warn('⚠️ Cache clear warning:', error.message);
  // }

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// IPC handler to save üretim records via API
ipcMain.handle('save-uretim', async (event, record) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/uretim`, record);
    return { ok: true, data: response.data };
  } catch (err) {
    console.error('API Error (save-uretim):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

// IPC handler to list üretim records via API
ipcMain.handle('list-uretim', async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/uretim`);
    return { ok: true, records: response.data };
  } catch (err) {
    console.error('API Error (list-uretim):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message, records: [] };
  }
});

// IPC handlers for operasyon (operations) records via API
ipcMain.handle('save-operasyon', async (event, record) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/operasyon`, record);
    return { ok: true, data: response.data };
  } catch (err) {
    console.error('API Error (save-operasyon):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

ipcMain.handle('list-operasyon', async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/operasyon`);
    return { ok: true, records: response.data };
  } catch (err) {
    console.error('API Error (list-operasyon):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message, records: [] };
  }
});

// IPC handlers for products via API
ipcMain.handle('save-product', async (event, record) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/Products`, record);
    return { ok: true, data: response.data };
  } catch (err) {
    console.error('API Error (save-product):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

ipcMain.handle('list-products', async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/Products`);
    return { ok: true, records: response.data };
  } catch (err) {
    console.error('API Error (list-products):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message, records: [] };
  }
});

// Delete handlers via API (using ID instead of savedAt)
ipcMain.handle('delete-uretim', async (event, id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/uretim/${id}`);
    return { ok: true, removed: true };
  } catch (err) {
    console.error('API Error (delete-uretim):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

ipcMain.handle('delete-operasyon', async (event, id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/operasyon/${id}`);
    return { ok: true, removed: true };
  } catch (err) {
    console.error('API Error (delete-operasyon):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

// CSV Staging functionality for batch operations
function stagedCsvPath(type) {
  return path.join(app.getPath('userData'), `staged-${type}.csv`);
}

function escapeCsvCell(s) {
  if (s == null) s = '';
  s = String(s);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i+1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function readStagedCsv(type) {
  try {
    const p = stagedCsvPath(type);
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length);
    if (!lines.length) return [];
    
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      const obj = {
        _stagedId: cells[0] || '',
        _stagedAt: Number(cells[1]) || 0,
        payload: (() => {
          try { return JSON.parse(cells[2] || '{}'); } catch (e) { return { _raw: cells[2] }; }
        })()
      };
      rows.push(obj);
    }
    return rows;
  } catch (err) {
    console.error('readStagedCsv error:', err);
    return [];
  }
}

function appendStagedCsvRow(type, stagedId, stagedAt, payloadObj) {
  try {
    const p = stagedCsvPath(type);
    const exists = fs.existsSync(p);
    const header = '_stagedId,_stagedAt,payload\n';
    const payloadJson = JSON.stringify(payloadObj);
    const line = [
      escapeCsvCell(stagedId),
      escapeCsvCell(String(stagedAt)),
      escapeCsvCell(payloadJson)
    ].join(',') + '\n';
    
    if (!exists) {
      fs.writeFileSync(p, header + line, 'utf8');
    } else {
      fs.appendFileSync(p, line, 'utf8');
    }
  } catch (err) {
    console.error('appendStagedCsvRow error:', err);
    throw err;
  }
}

// Staging IPC handlers
ipcMain.handle('staging-add', async (_, type, record) => {
  try {
    const stagedId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const stagedAt = Date.now();
    appendStagedCsvRow(type, stagedId, stagedAt, record);
    return stagedId;
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('staging-list', async (_, type) => {
  try {
    const rows = readStagedCsv(type);
    return rows.map(r => Object.assign({ _stagedId: r._stagedId, _stagedAt: r._stagedAt }, r.payload));
  } catch (err) {
    console.error('staging-list error:', err);
    return [];
  }
});

ipcMain.handle('staging-clear', async (_, type) => {
  try {
    const p = stagedCsvPath(type);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  } catch (err) {
    console.error('staging-clear error:', err);
    return false;
  }
});

ipcMain.handle('staging-delete', async (_, type, stagedId) => {
  try {
    const rows = readStagedCsv(type);
    const filtered = rows.filter(r => r._stagedId !== stagedId);
    
    // Rewrite the CSV file without the deleted record
    const p = stagedCsvPath(type);
    const header = '_stagedId,_stagedAt,payload\n';
    
    if (filtered.length === 0) {
      // If no records left, delete the file
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } else {
      // Rewrite file with remaining records
      const lines = filtered.map(r => {
        const payloadJson = JSON.stringify(r.payload);
        return [
          escapeCsvCell(r._stagedId),
          escapeCsvCell(String(r._stagedAt)),
          escapeCsvCell(payloadJson)
        ].join(',');
      });
      fs.writeFileSync(p, header + lines.join('\n') + '\n', 'utf8');
    }
    
    return { ok: true, removed: rows.length - filtered.length };
  } catch (err) {
    console.error('staging-delete error:', err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('staging-upload', async (_, type) => {
  try {
    const staged = readStagedCsv(type);
    if (!staged.length) return { ok: true, uploaded: 0 };
    
    // Send staged data to API
    const records = staged.map(r => r.payload || {});
    const response = await axios.post(`${API_BASE_URL}/${type}/batch`, records);
    
    // Clear staged CSV on success
    const p = stagedCsvPath(type);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return { ok: true, uploaded: response.data.length || records.length };
  } catch (err) {
    console.error('staging-upload error:', err);
    return { ok: false, uploaded: 0, error: err.response?.data?.message || err.message };
  }
});

// Operation Types API handler
ipcMain.handle('get-operation-types', async (_, onlyActive = false) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/operasyon/types`, {
      params: { onlyActive }
    });
    return { ok: true, operations: response.data };
  } catch (err) {
    console.error('API Error (get-operation-types):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message, operations: [] };
  }
});

// Cycle Times API handlers
ipcMain.handle('save-cycle-time', async (event, record) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/CycleTimes`, record);
    return { ok: true, data: response.data };
  } catch (err) {
    console.error('API Error (save-cycle-time):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

ipcMain.handle('list-cycle-times', async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/CycleTimes`);
    return { ok: true, records: response.data };
  } catch (err) {
    console.error('API Error (list-cycle-times):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message, records: [] };
  }
});

ipcMain.handle('delete-cycle-time', async (event, id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/CycleTimes/${id}`);
    return { ok: true, removed: true };
  } catch (err) {
    console.error('API Error (delete-cycle-time):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

// Product lookup handler
ipcMain.handle('lookup-product', async (event, productCode) => {
  try {
    if (!productCode) {
      return { ok: false, error: 'Product code is required' };
    }
    
    const response = await axios.get(`${API_BASE_URL}/Products`);
    const products = Array.isArray(response.data) ? response.data : (response.data?.data || []);
    
    const product = products.find(p => 
      p.productCode && p.productCode.toUpperCase() === productCode.trim().toUpperCase()
    );
    
    if (product) {
      return { 
        ok: true, 
        product: {
          id: product.id,
          name: product.name,
          productCode: product.productCode,
          type: product.type
        }
      };
    } else {
      return { ok: false, error: 'Product not found' };
    }
  } catch (err) {
    console.error('API Error (lookup-product):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

// Orders API handlers
ipcMain.handle('save-order', async (event, record) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/Orders`, record);
    return { ok: true, data: response.data };
  } catch (err) {
    console.error('API Error (save-order):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

ipcMain.handle('list-orders', async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/Orders`);
    return { ok: true, records: response.data };
  } catch (err) {
    console.error('API Error (list-orders):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message, records: [] };
  }
});

ipcMain.handle('delete-order', async (event, id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/Orders/${id}`);
    return { ok: true, removed: true };
  } catch (err) {
    console.error('API Error (delete-order):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});