const { app, BrowserWindow } = require('electron');
const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// API Configuration
const API_BASE_URL = 'https://localhost:7196/api';

// Configure axios to ignore self-signed certificates for localhost
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'arifk.co - Takip Sistemi',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.loadFile('index.html');
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
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

// IPC handlers for paketleme (packing) records via API
ipcMain.handle('save-paketleme', async (event, record) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/paketleme`, record);
    return { ok: true, data: response.data };
  } catch (err) {
    console.error('API Error (save-paketleme):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

ipcMain.handle('list-paketleme', async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/paketleme`);
    return { ok: true, records: response.data };
  } catch (err) {
    console.error('API Error (list-paketleme):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message, records: [] };
  }
});

// IPC handlers for product (urun) records via API
ipcMain.handle('save-urun', async (event, record) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/urun`, record);
    return { ok: true, data: response.data };
  } catch (err) {
    console.error('API Error (save-urun):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

ipcMain.handle('list-urun', async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/urun`);
    return { ok: true, records: response.data };
  } catch (err) {
    console.error('API Error (list-urun):', err.message);
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

// IPC handlers for siparis (orders) via API
ipcMain.handle('save-siparis', async (event, record) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/siparis`, record);
    return { ok: true, data: response.data };
  } catch (err) {
    console.error('API Error (save-siparis):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

ipcMain.handle('list-siparis', async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/siparis`);
    return { ok: true, records: response.data };
  } catch (err) {
    console.error('API Error (list-siparis):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message, records: [] };
  }
});

// import-siparis: open dialog, parse .csv and .xlsx files and append rows to siparis-records.json
ipcMain.handle('import-siparis', async (event, filePathsArg) => {
  try {
    let filePaths = filePathsArg;
    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      const { canceled, filePaths: picked } = await dialog.showOpenDialog({
        title: 'Dosya seç (CSV veya XLSX)',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Sheets & CSV', extensions: ['csv', 'xlsx', 'xls'] }
        ]
      });
      if (canceled || !picked || picked.length === 0) return { ok: true, imported: [] };
      filePaths = picked;
    }

    // lazy-require xlsx so app still runs if package missing
    let XLSX = null;
    try { XLSX = require('xlsx'); } catch (e) { /* will handle below for xlsx files */ }

    const rows = [];
    for (const p of filePaths) {
      const ext = path.extname(p || '').toLowerCase();
      if (ext === '.csv') {
        const raw = fs.readFileSync(p, 'utf8');
        const lines = raw.split(/\r?\n/).filter(Boolean);
        if (lines.length === 0) continue;
        const headers = lines[0].split(',').map(h => h.trim());
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          const obj = {};
          headers.forEach((h, idx) => { obj[h] = (cols[idx] || '').trim(); });
          rows.push(obj);
        }
      } else if (ext === '.xlsx' || ext === '.xls') {
        if (!XLSX) {
          return { ok: false, error: 'xlsx parser not installed. run npm install xlsx' };
        }
        const workbook = XLSX.readFile(p);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        for (const r of json) rows.push(r);
      }
    }

    // helper: normalize keys for robust matching
    const normalize = (s) => String(s || '').toLowerCase().replace(/\s+/g, '').normalize('NFD').replace(/[^\w]/g, '');
    const buildNormMap = (obj) => {
      const map = {};
      Object.keys(obj || {}).forEach(k => { map[normalize(k)] = obj[k]; });
      return map;
    };

    const mapRow = (r) => {
      const norm = buildNormMap(r);
      const pick = (variants, fallback='') => {
        for (const v of variants) if (norm[v] !== undefined) return norm[v];
        return fallback;
      };
      return {
        urunKodu: pick(['urunkodu','ürünkodu','urunkod','productcode','product_code']),
        aciklama: pick(['aciklama','açıklama','description','desc']),
        secenekler: pick(['secenekler','seçenekler','options']),
        belgeNo: pick(['belgeno','belgeno','belgeno','docno','belgeno']),
        musteriAdi: pick(['musteriadi','müşteriadı','musteri','customer']),
        siparisAdet: pick(['siparisadet','siparişadet','qty','quantity'], '0'),
        devirSayisi: pick(['devirsayisi','devirsayısı','turns'], '0')
      };
    };

    const mappedAll = rows.map(mapRow);

    // Send data to API instead of saving to JSON file
    const response = await axios.post(`${API_BASE_URL}/siparis/import`, mappedAll);

    return { ok: true, imported: response.data, filePaths };
  } catch (err) {
    console.error('API Error (import-siparis):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

// preview-siparis: open dialog, parse .csv and .xlsx files but DO NOT save; return parsed rows and filePaths (limit to first 20 rows)
ipcMain.handle('preview-siparis', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Dosya seç (CSV veya XLSX)',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Sheets & CSV', extensions: ['csv', 'xlsx', 'xls'] }
      ]
    });
    if (canceled || !filePaths || filePaths.length === 0) return { ok: true, rows: [], filePaths: [] };

    let XLSX = null;
    try { XLSX = require('xlsx'); } catch (e) { }

    const rows = [];
    for (const p of filePaths) {
      const ext = path.extname(p || '').toLowerCase();
      if (ext === '.csv') {
        const raw = fs.readFileSync(p, 'utf8');
        const lines = raw.split(/\r?\n/).filter(Boolean);
        if (lines.length === 0) continue;
        const headers = lines[0].split(',').map(h => h.trim());
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          const obj = {};
          headers.forEach((h, idx) => { obj[h] = (cols[idx] || '').trim(); });
          rows.push(obj);
        }
      } else if (ext === '.xlsx' || ext === '.xls') {
        if (!XLSX) {
          return { ok: false, error: 'xlsx parser not installed. run npm install xlsx' };
        }
        const workbook = XLSX.readFile(p);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        for (const r of json) rows.push(r);
      }
    }

    // normalize + map using robust normalization (matches variants like "Seçenekler", "Belge No", "Müşteri" etc.)
    const normalize = (s) => String(s || '').toLowerCase().replace(/\s+/g, '').normalize('NFD').replace(/[^\w]/g, '');
    const buildNormMap = (obj) => {
      const map = {};
      Object.keys(obj || {}).forEach(k => { map[normalize(k)] = obj[k]; });
      return map;
    };

    const mapRow = (r) => {
      const norm = buildNormMap(r);
      const pick = (variants, fallback='') => {
        for (const v of variants) if (norm[v] !== undefined) return norm[v];
        return fallback;
      };
      return {
        urunKodu: pick(['urunkodu','ürünkodu','urunkod','productcode','product_code','urunkodu','urun kodu']),
        aciklama: pick(['aciklama','açıklama','description','desc']),
        secenekler: pick(['secenekler','seçenekler','options','secenek','secenekler']),
        belgeNo: pick(['belgeno','belge_no','belgeno','docno','doc_no','belge','belgeno','belge no']),
        musteriAdi: pick(['musteriadi','müşteriadı','musteri','customer','musteri adi','müşteri']),
        siparisAdet: pick(['siparisadet','siparişadet','qty','quantity','adet'], '0'),
        devirSayisi: pick(['devirsayisi','devirsayısı','devir','turns'], '0')
      };
    };

    const mapped = rows.map(mapRow);
    return { ok: true, rows: mapped, filePaths };
  } catch (err) {
    return { ok: false, error: String(err) };
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

ipcMain.handle('delete-paketleme', async (event, id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/paketleme/${id}`);
    return { ok: true, removed: true };
  } catch (err) {
    console.error('API Error (delete-paketleme):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

ipcMain.handle('delete-urun', async (event, id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/urun/${id}`);
    return { ok: true, removed: true };
  } catch (err) {
    console.error('API Error (delete-urun):', err.message);
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

ipcMain.handle('delete-siparis', async (event, id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/siparis/${id}`);
    return { ok: true, removed: true };
  } catch (err) {
    console.error('API Error (delete-siparis):', err.message);
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