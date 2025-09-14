const { app, BrowserWindow } = require('electron');
const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// API Configuration
const API_BASE_URL = 'https://localhost:7287';

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
      nodeIntegration: false,
      webSecurity: false // SSL certificate sorununu çözmek için
    }
  })

  win.loadFile('index.html');
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
    const response = await axios.post(`${API_BASE_URL}/api/Products`, record);
    return { ok: true, data: response.data };
  } catch (err) {
    console.error('API Error (save-product):', err.message);
    return { ok: false, error: err.response?.data?.message || err.message };
  }
});

ipcMain.handle('list-products', async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/Products`);
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