// Basit ve modüler tablo helper'ı
// Sadece CRUD, pagination, search işlevselliği

// Helper functions (eski helper'dan taşınan)
export function showToast(message, type = 'info') {
  try {
    const el = document.createElement('div');
    el.textContent = message;
    let bgClass = 'bg-neutral-700'; // default
    if (type === 'success') bgClass = 'bg-green-600';
    else if (type === 'error') bgClass = 'bg-rose-600';
    else if (type === 'warning') bgClass = 'bg-amber-600';
    
    el.className = `fixed bottom-6 right-6 px-4 py-2 rounded shadow z-50 ${bgClass}`;
    document.body.appendChild(el);
    setTimeout(() => {
      try { el.remove(); } catch(e) { /* element might be already removed */ }
    }, 4000);
  } catch (err) {
    console.error('showToast error:', err);
  }
}

export function showFormErrors(form, errors) {
  try {
    if (!form || !Array.isArray(errors)) return;
    clearFormErrors(form);
    
    errors.forEach(err => {
      if (!err.field || !err.msg) return;
      const field = form.querySelector(`[name="${err.field}"]`);
      if (!field) return;
      
      field.classList.add('border', 'border-rose-500');
      let note = field.parentElement.querySelector('.field-error');
      if (!note) {
        note = document.createElement('div');
        note.className = 'field-error text-rose-400 text-sm mt-1';
        field.parentElement.appendChild(note);
      }
      note.textContent = err.msg;
    });
  } catch (err) {
    console.error('showFormErrors error:', err);
  }
}

export function clearFormErrors(form) {
  try {
    if (!form) return;
    form.querySelectorAll('.field-error').forEach(n => n.remove());
    form.querySelectorAll('.border-rose-500').forEach(el => el.classList.remove('border', 'border-rose-500'));
  } catch (err) {
    console.error('clearFormErrors error:', err);
  }
}

export function createSimpleTable(config) {
  const {
    apiBaseUrl,
    endpoints, // { list, activate, deactivate, update }
    columns, // Array of column definitions
    searchFields = [],
    title = 'Data Table',
    emptyMessage = 'Kayıt bulunamadı',
    onDataLoaded = () => {},
    // Spesifik işlemler için callback'ler
    renderCell = (value, record, column) => value || '-', // Custom cell rendering
    createEditInput = (value, record, column) => `<input type="text" value="${value || ''}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs">`, // Custom edit input
    validateRowData = (data) => ({ isValid: true, errors: [] }),
    formatPayload = (data) => data // Transform data for API
  } = config;

  const container = document.createElement('div');
  let showInactive = false;
  let currentPage = 1;
  let pageSize = 20;
  let allRecords = [];
  let select, searchInput, showInactiveCheckbox, pager, debugInfo, tableContainer;

  // Initialize UI components
  function initializeComponents() {
    container.innerHTML = '';

    // Row count selector
    const selectorWrap = document.createElement('div');
    selectorWrap.className = 'flex items-center gap-2 text-sm';
    selectorWrap.innerHTML = `
      <label>Sayfa başına:</label>
      <select class="px-2 py-1 rounded bg-neutral-800 text-neutral-200">
        <option value="5">5</option>
        <option value="10">10</option>
        <option value="20" selected>20</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
    `;
    select = selectorWrap.querySelector('select');

    // Search input
    const searchWrap = document.createElement('div');
    searchWrap.className = 'ml-2';
    searchWrap.innerHTML = `<input type="search" placeholder="Tabloda ara..." class="px-3 py-2 rounded bg-neutral-800 text-neutral-200" />`;
    searchInput = searchWrap.querySelector('input');

    // Top row: Controls
    const topRow = document.createElement('div');
    topRow.className = 'flex justify-between items-center mb-4';
    topRow.innerHTML = `<h3 class="text-lg font-semibold">${title}</h3>`;
    
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'flex items-center gap-2';
    
    // Refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm text-white';
    refreshBtn.innerHTML = '🔄 Yenile';
    refreshBtn.title = 'Tabloyu backend\'den yeniden yükle';
    controlsDiv.appendChild(refreshBtn);
    
    controlsDiv.appendChild(selectorWrap);
    controlsDiv.appendChild(searchWrap);
    topRow.appendChild(controlsDiv);

    // Filter toggle for active/inactive records - tabloda ara'nın altında
    const filterWrap = document.createElement('div');
    filterWrap.className = 'mb-4 ml-auto max-w-xs';
    filterWrap.innerHTML = `
      <label class="flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" id="show-inactive" ${showInactive ? 'checked' : ''} class="rounded"/>
        Pasif kayıtları da göster
      </label>
    `;
    showInactiveCheckbox = filterWrap.querySelector('#show-inactive');

    // Table container
    tableContainer = document.createElement('div');
    tableContainer.className = 'overflow-x-auto';

    // Pagination
    pager = document.createElement('div');
    pager.className = 'flex justify-between items-center mt-4 text-sm text-neutral-400';

    // Debug info
    debugInfo = document.createElement('div');
    debugInfo.className = 'mt-2 text-xs text-neutral-500';

    // Assemble
    container.appendChild(topRow);
    container.appendChild(filterWrap);
    container.appendChild(tableContainer);
    container.appendChild(pager);
    container.appendChild(debugInfo);

    // Event listeners
    select.addEventListener('change', (e) => {
      pageSize = parseInt(e.target.value);
      currentPage = 1;
      renderTable();
    });

    searchInput.addEventListener('input', () => {
      currentPage = 1;
      renderTable();
    });

    showInactiveCheckbox.addEventListener('change', (e) => {
      showInactive = e.target.checked;
      console.log('📊 Show inactive changed:', showInactive);
      loadData(); // Yeni API isteği at
    });
    
    // Refresh button
    refreshBtn.addEventListener('click', async () => {
      console.log('🔄 Manual table refresh requested');
      await loadData();
      showToast('Tablo yenilendi', 'success');
    });
  }

  // Load data from API
  async function loadData() {
    try {
      // API URL'ye status parametresi ekle
      const statusParam = showInactive ? 'all' : 'active';
      const url = `${apiBaseUrl}${endpoints.list}?status=${statusParam}`;
      console.log('📡 Loading data from:', url, '(Show inactive:', showInactive, ')');

      // Backend connectivity testi
      try {
        const testResponse = await fetch(apiBaseUrl.replace('/api', '/health'), { 
          method: 'GET',
          timeout: 5000
        });
        console.log('🏥 Backend health check:', testResponse.status);
      } catch (healthError) {
        console.warn('⚠️ Backend health check failed:', healthError.message);
        console.warn('💡 Backend server çalışıyor mu? Port 7287 dinleniyor mu?');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // API response format handling
      let records = [];
      if (Array.isArray(result)) {
        records = result;
      } else if (result?.data && Array.isArray(result.data)) {
        records = result.data;
      } else if (result?.success && result?.data && Array.isArray(result.data)) {
        records = result.data;
      } else {
        console.warn('Unexpected API response format:', result);
        records = [];
      }
      
      allRecords = records;
      
      console.log('✅ Data loaded:', allRecords.length, 'records');
      onDataLoaded(allRecords);
      renderTable();

    } catch (err) {
      console.error('❌ LOAD DATA ERROR:', err);
      
      // Hata tipine göre özel mesajlar
      let errorMessage = 'Veri yüklenirken hata oluştu';
      let troubleshooting = '';
      
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        errorMessage = 'Backend sunucusuna bağlanılamıyor';
        troubleshooting = '🔧 Kontrol edin: Backend server çalışıyor mu? (localhost:7287)';
      } else if (err.message.includes('ERR_EMPTY_RESPONSE')) {
        errorMessage = 'Sunucu boş yanıt döndürdü';
        troubleshooting = '🔧 Kontrol edin: API endpoint\'i doğru mu?';
      } else if (err.message.includes('CORS')) {
        errorMessage = 'CORS hatası';
        troubleshooting = '🔧 Kontrol edin: Backend CORS ayarları';
      }
      
      console.error('🚨 ERROR TYPE:', err.name);
      console.error('📝 ERROR MESSAGE:', err.message);
      console.error('🔧 TROUBLESHOOTING:', troubleshooting);
      
      tableContainer.innerHTML = `
        <div class="text-center py-8">
          <div class="text-rose-400 mb-2">${errorMessage}</div>
          <div class="text-neutral-500 text-sm">${err.message}</div>
          ${troubleshooting ? `<div class="text-yellow-400 text-sm mt-2">${troubleshooting}</div>` : ''}
        </div>
      `;
    }
  }

  // Filter and search data
  function getFilteredData() {
    let filtered = allRecords;

    // API'den zaten doğru status ile veri geliyor, sadece search filtresi uygula
    const searchTerm = searchInput?.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(record => {
        return searchFields.some(field => {
          const value = record[field];
          return value && value.toString().toLowerCase().includes(searchTerm);
        });
      });
    }

    return filtered;
  }

  // Render table
  function renderTable() {
    const filteredData = getFilteredData();
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const pageData = filteredData.slice(startIndex, endIndex);

    // Table HTML
    let tableHTML = `
      <table class="w-full bg-neutral-800 rounded-lg overflow-hidden">
        <thead class="bg-neutral-700">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-bold text-neutral-300 uppercase tracking-wider w-32">İşlemler</th>
    `;

    columns.forEach(col => {
      tableHTML += `<th class="px-4 py-3 text-left text-xs font-bold text-neutral-300 uppercase tracking-wider ${col.className || ''}">${col.header}</th>`;
    });

    tableHTML += `
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-700">
    `;

    if (pageData.length === 0) {
      tableHTML += `
        <tr>
          <td colspan="${columns.length + 1}" class="px-4 py-8 text-center text-neutral-400">${emptyMessage}</td>
        </tr>
      `;
    } else {
      pageData.forEach(record => {
        const isActive = record.isActive !== false;
        tableHTML += `
          <tr class="hover:bg-neutral-700/50 ${!isActive ? 'opacity-60' : ''}">
            <td class="px-4 py-3">
              <div class="flex gap-1">
                <button onclick="this.closest('[data-table]').editRecord('${record.id}')" class="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs">Düzenle</button>
                <button onclick="this.closest('[data-table]').toggleRecord('${record.id}')" class="px-2 py-1 rounded ${isActive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-green-600 hover:bg-green-500'} text-xs">
                  ${isActive ? 'Pasif' : 'Aktif'}
                </button>
              </div>
            </td>
        `;

        columns.forEach(col => {
          const value = record[col.field];
          const renderedValue = renderCell(value, record, col);
          tableHTML += `<td class="px-4 py-3 text-sm ${col.className || ''}" data-field="${col.field}">${renderedValue}</td>`;
        });

        tableHTML += '</tr>';
      });
    }

    tableHTML += `
        </tbody>
      </table>
    `;

    tableContainer.innerHTML = tableHTML;
    tableContainer.querySelector('table').setAttribute('data-table', 'true');

    // Update pagination
    updatePagination(currentPage, totalPages, startIndex + 1, endIndex, totalItems);

    // Attach methods to table for onclick events
    const table = tableContainer.querySelector('[data-table]');
    table.editRecord = editRecord;
    table.toggleRecord = toggleRecord;
  }

  // Update pagination display
  function updatePagination(current, total, start, end, totalItems) {
    const prevDisabled = current <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-700 cursor-pointer';
    const nextDisabled = current >= total ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-700 cursor-pointer';

    pager.innerHTML = `
      <div>Sayfa ${current} / ${total} (Toplam ${totalItems} kayıt)</div>
      <div class="flex gap-2">
        <button class="px-3 py-1 rounded bg-neutral-700 ${prevDisabled}" ${current > 1 ? `onclick="this.closest('[data-container]').prevPage()"` : ''}>Önceki</button>
        <button class="px-3 py-1 rounded bg-neutral-700 ${nextDisabled}" ${current < total ? `onclick="this.closest('[data-container]').nextPage()"` : ''}>Sonraki</button>
      </div>
    `;

    container.setAttribute('data-container', 'true');
    container.prevPage = () => { if (currentPage > 1) { currentPage--; renderTable(); } };
    container.nextPage = () => { if (currentPage < total) { currentPage++; renderTable(); } };
  }

  // Edit record - Bu artık sekmeler tarafından customize edilecek
  function editRecord(id) {
    const record = allRecords.find(r => r.id == id);
    if (!record) return;

    console.log('✏️ Edit record:', record);
    
    // Basit inline editing
    const row = tableContainer.querySelector(`tr:has(button[onclick*="${id}"])`);
    if (!row) return;

    const editableFields = {};

    // Convert cells to inputs using custom createEditInput
    columns.forEach(col => {
      if (col.editable) {
        const cell = row.querySelector(`[data-field="${col.field}"]`);
        const originalValue = record[col.field] || '';
        
        const inputHTML = createEditInput(originalValue, record, col);
        cell.innerHTML = inputHTML;
        editableFields[col.field] = cell.querySelector('input, select, textarea');
      }
    });

    // Replace action buttons
    const actionCell = row.querySelector('td:first-child div');
    actionCell.innerHTML = `
      <div class="flex gap-1">
        <button class="save-btn px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-xs">Kaydet</button>
        <button class="cancel-btn px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 text-xs">İptal</button>
      </div>
    `;

    // Save handler
    actionCell.querySelector('.save-btn').addEventListener('click', async () => {
      // Eğer customUpdateHandler varsa onu kullan
      if (typeof config.customUpdateHandler === 'function') {
        const success = await config.customUpdateHandler(
          id, 
          editableFields, 
          record, 
          apiBaseUrl, 
          showToast, 
          loadData
        );
        if (success) {
          renderTable(); // Düzenleme modundan çık
        }
        return;
      }
      
      // Varsayılan güncelleme işlemi
      const newData = {};
      Object.keys(editableFields).forEach(field => {
        newData[field] = editableFields[field].value.trim();
      });

      const validation = validateRowData(newData);
      if (!validation.isValid) {
        showToast(validation.errors.join(', '), 'error');
        return;
      }

      await updateRecord(id, newData);
    });

    // Cancel handler
    actionCell.querySelector('.cancel-btn').addEventListener('click', () => {
      renderTable();
    });
  }

  // Toggle record active/inactive status
  async function toggleRecord(id) {
    const record = allRecords.find(r => r.id == id);
    if (!record) return;

    const isActive = record.isActive !== false;
    const endpoint = isActive ? endpoints.deactivate : endpoints.activate;
    
    try {
      const url = `${apiBaseUrl}${endpoint.replace('{id}', id)}`;
      const response = await fetch(url, { method: 'PATCH' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`✅ Record ${isActive ? 'deactivated' : 'activated'}`);
      showToast(`Kayıt ${isActive ? 'pasif' : 'aktif'} hale getirildi`, 'success');
      await loadData();

    } catch (err) {
      console.error('❌ TOGGLE ERROR:', err);
      showToast('Durum değiştirme hatası: ' + err.message, 'error');
    }
  }

  // Update record
  async function updateRecord(id, data) {
    try {
      const payload = formatPayload(data);
      const url = `${apiBaseUrl}${endpoints.update.replace('{id}', id)}`;
      
      console.log('🔄 UPDATE REQUEST');
      console.log('🔗 PUT URL:', url);
      console.log('📤 PUT PAYLOAD:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('📥 PUT RESPONSE STATUS:', response.status, response.statusText);

      if (!response.ok) {
        const responseText = await response.text();
        console.log('❌ PUT RESPONSE ERROR BODY:', responseText);
        throw new Error(`HTTP ${response.status} ${response.statusText} - ${responseText}`);
      }

      const responseData = await response.json();
      console.log('✅ PUT SUCCESS RESPONSE:', responseData);

      showToast('Kayıt başarıyla güncellendi', 'success');
      await loadData();

    } catch (err) {
      console.error('❌ UPDATE ERROR:', err);
      showToast('Güncelleme hatası: ' + err.message, 'error');
    }
  }

  // Public API
  container.init = async () => {
    initializeComponents();
    await loadData();
  };

  container.reload = loadData;
  
  // Yeni kayıt ekleme (backend'e istek atmadan)
  container.addRecord = (newRecord) => {
    if (!newRecord || !newRecord.id) {
      console.warn('⚠️ Invalid record for adding:', newRecord);
      return;
    }
    
    // Aktif kayıtları gösteriyorsak ve kayıt aktifse ekle
    if (!showInactive && newRecord.isActive === false) {
      console.log('📝 Record is inactive, not adding to active view');
      return;
    }
    
    // Kayıt zaten var mı kontrol et
    const existingIndex = allRecords.findIndex(r => r.id == newRecord.id);
    if (existingIndex !== -1) {
      console.log('📝 Record already exists, updating:', newRecord.id);
      allRecords[existingIndex] = newRecord;
    } else {
      console.log('📝 Adding new record:', newRecord.id);
      allRecords.unshift(newRecord); // En başa ekle
    }
    
    // Tabloyu yeniden render et
    renderTable();
  };

  return container;
}