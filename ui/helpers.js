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

// Enhanced async API wrapper with error handling
export async function safeApiCall(apiMethod, ...args) {
  try {
    const result = await apiMethod(...args);
    return result;
  } catch (err) {
    console.error('API call failed:', err);
    showToast(`İşlem başarısız: ${err.message || 'Bilinmeyen hata'}`, 'error');
    return { ok: false, error: err.message || String(err) };
  }
}

// Enhanced delete with confirmation
export async function safeDelete(deleteMethod, itemId, itemName = 'kayıt') {
  try {
    showToast(`${itemName} siliniyor...`, 'warning');
    
    const result = await deleteMethod(itemId);
    if (result && result.ok && result.removed) {
      showToast(`${itemName} silindi`, 'success');
      return true;
    } else {
      showToast(`${itemName} silinemedi`, 'error');
      return false;
    }
  } catch (err) {
    console.error('Delete operation failed:', err);
    showToast(`Silme hatası: ${err.message || 'Bilinmeyen hata'}`, 'error');
    return false;
  }
}

export function createRowCountSelector(initial = 20) {
  const wrapper = document.createElement('div');
  wrapper.className = 'mb-2 flex items-center gap-2';
  const label = document.createElement('label');
  label.className = 'text-sm text-neutral-400';
  label.textContent = 'Satır:';
  const select = document.createElement('select');
  select.className = 'px-2 py-1 bg-neutral-800 rounded text-neutral-100';
  const options = [5,10,15,20,50,100,'All'];

  // prefer saved preference if available
  let saved = null;
  try { saved = localStorage.getItem('rowCountPref'); } catch(e) { saved = null; }
  const initialValue = saved || (initial === 'All' ? 'all' : String(initial));

  options.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o === 'All' ? 'all' : String(o);
    opt.textContent = o === 'All' ? 'All' : String(o);
    if (opt.value === String(initialValue)) opt.selected = true;
    select.appendChild(opt);
  });

  // persist on change
  select.addEventListener('change', () => {
    try { localStorage.setItem('rowCountPref', select.value); } catch(e) { /* ignore */ }
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);
  return { wrapper, select };
}

export function createPaginationControls(totalItems = 0, pageSize = 20, currentPage = 1, onPage = () => {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'mt-2 flex items-center gap-2';

  const prev = document.createElement('button');
  prev.className = 'px-2 py-1 bg-neutral-800 rounded text-neutral-200 disabled:opacity-50';
  prev.textContent = '<';

  const pages = document.createElement('div');
  pages.className = 'flex items-center gap-1';

  const info = document.createElement('div');
  info.className = 'text-sm text-neutral-400 ml-2';

  const next = document.createElement('button');
  next.className = 'px-2 py-1 bg-neutral-800 rounded text-neutral-200 disabled:opacity-50';
  next.textContent = '>';

  let totalPages = Math.max(1, Math.ceil((totalItems || 0) / (pageSize || 1)));
  let current = Math.min(Math.max(1, Number(currentPage || 1)), totalPages);

  function buildPages() {
    pages.innerHTML = '';
    // show up to 7 page buttons centered on current
    const maxButtons = 7;
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
    for (let p = start; p <= end; p++) {
      const b = document.createElement('button');
      b.className = `px-2 py-1 rounded ${p===current ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-200'}`;
      b.textContent = String(p);
      b.addEventListener('click', () => { if (p !== current) { current = p; onPage(current); render(); } });
      pages.appendChild(b);
    }
  }

  function render() {
    totalPages = Math.max(1, Math.ceil((totalItems || 0) / (pageSize || 1)));
    current = Math.min(Math.max(1, Number(current || 1)), totalPages);
    prev.disabled = current <= 1;
    next.disabled = current >= totalPages;
    info.textContent = `Sayfa ${current} / ${totalPages} (Toplam ${totalItems})`;
    buildPages();
  }

  prev.addEventListener('click', () => { if (current > 1) { current -= 1; onPage(current); render(); } });
  next.addEventListener('click', () => { if (current < totalPages) { current += 1; onPage(current); render(); } });

  wrapper.appendChild(prev);
  wrapper.appendChild(pages);
  wrapper.appendChild(info);
  wrapper.appendChild(next);

  // expose update method to refresh total/pageSize/current
  wrapper.update = (newTotal = totalItems, newPageSize = pageSize, newCurrent = 1) => {
    totalItems = Number(newTotal || 0);
    pageSize = Number(newPageSize || 20) || 20;
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    current = Math.min(Math.max(1, Number(newCurrent || 1)), totalPages);
    render();
  };

  // initial render
  wrapper.update(totalItems, pageSize, currentPage);
  return wrapper;
}

// Common staging controls for batch operations
export function createStagingControls(type, options = {}) {
  const {
    onAddLocal = () => {},
    onUploadAll = () => {},
    onClearAll = () => {},
    refreshCallback = () => {}
  } = options;

  const wrapper = document.createElement('div');
  wrapper.className = 'mb-4 p-3 bg-neutral-800 rounded flex items-center justify-between gap-4';
  
  const leftSide = document.createElement('div');
  leftSide.className = 'flex items-center gap-3';
  
  const addLocalBtn = document.createElement('button');
  addLocalBtn.className = 'px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm';
  addLocalBtn.textContent = 'Local\'e Ekle (CSV)';
  
  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'px-3 py-2 rounded bg-green-600 hover:bg-green-500 text-sm';
  uploadBtn.textContent = 'Tümünü DB\'ye Aktar';
  
  const clearBtn = document.createElement('button');
  clearBtn.className = 'px-2 py-2 rounded bg-neutral-600 hover:bg-neutral-500 text-sm';
  clearBtn.textContent = 'Temizle';
  
  const rightSide = document.createElement('div');
  rightSide.className = 'text-sm text-neutral-400';
  
  const statusSpan = document.createElement('span');
  statusSpan.textContent = 'Local kayıtlar: 0';
  
  leftSide.appendChild(addLocalBtn);
  leftSide.appendChild(uploadBtn);
  leftSide.appendChild(clearBtn);
  rightSide.appendChild(statusSpan);
  wrapper.appendChild(leftSide);
  wrapper.appendChild(rightSide);
  
  // Event handlers with error handling
  addLocalBtn.addEventListener('click', async () => {
    try {
      await onAddLocal();
      await refreshStatus();
    } catch (err) {
      console.error('Add local error:', err);
      showToast('Local ekleme hatası', 'error');
    }
  });
  
  uploadBtn.addEventListener('click', async () => {
    try {
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Aktarılıyor...';
      const result = await onUploadAll();
      await refreshStatus();
      if (result && result.ok) {
        showToast(`${result.uploaded || 0} kayıt aktarıldı`, 'success');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Aktarım hatası', 'error');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Tümünü DB\'ye Aktar';
    }
  });
  
  clearBtn.addEventListener('click', async () => {
    try {
      showToast('Local kayıtlar temizleniyor...', 'warning');
      await onClearAll();
      await refreshStatus();
      showToast('Local kayıtlar temizlendi', 'success');
    } catch (err) {
      console.error('Clear error:', err);
      showToast('Temizleme hatası', 'error');
    }
  });
  
  async function refreshStatus() {
    try {
      const staged = await window.api.stagingList(type);
      statusSpan.textContent = `Local kayıtlar: ${staged.length}`;
      await refreshCallback();
    } catch (err) {
      console.error('Refresh status error:', err);
      statusSpan.textContent = 'Local kayıtlar: --';
    }
  }
  
  // Initial status
  refreshStatus();
  
  // Expose methods
  wrapper.refreshStatus = refreshStatus;
  wrapper.getButtons = () => ({ addLocalBtn, uploadBtn, clearBtn });
  
  return wrapper;
}

// Common table utilities
export function createSearchableTable(config = {}) {
  const {
    searchFields = [],
    onDelete = null,
    emptyMessage = 'Kayıt bulunamadı'
  } = config;
  
  const wrapper = document.createElement('div');
  wrapper.className = 'mt-4';
  
  let allRecords = [];
  let filteredRecords = [];
  let searchInput = null;
  let pager = null;
  let tableContainer = null;
  
  function createSearchInput() {
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'mb-3 flex items-center gap-2';
    
    const searchLabel = document.createElement('label');
    searchLabel.className = 'text-sm text-neutral-400';
    searchLabel.textContent = 'Ara:';
    
    searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Tabloda ara...';
    searchInput.className = 'px-3 py-2 rounded bg-neutral-800 text-neutral-200 flex-1 max-w-sm';
    
    searchWrapper.appendChild(searchLabel);
    searchWrapper.appendChild(searchInput);
    
    // Debounced search
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterAndRender();
      }, 300);
    });
    
    return searchWrapper;
  }
  
  function filterRecords() {
    const query = (searchInput?.value || '').trim().toLowerCase();
    if (!query) return [...allRecords];
    
    return allRecords.filter(record => {
      return searchFields.some(field => {
        const value = record[field];
        return String(value || '').toLowerCase().includes(query);
      });
    });
  }
  
  function filterAndRender() {
    filteredRecords = filterRecords();
    if (pager && pager.update) {
      pager.update(filteredRecords.length, pager.pageSize || 20, 1);
    }
    renderTable();
  }
  
  function renderTable() {
    if (!tableContainer) return;
    
    if (filteredRecords.length === 0) {
      tableContainer.innerHTML = `<div class="text-neutral-400 text-center py-8">${emptyMessage}</div>`;
      return;
    }
    
    // This should be overridden by the calling code
    if (wrapper.customRender) {
      wrapper.customRender(filteredRecords, tableContainer);
    }
  }
  
  // Public methods
  wrapper.setRecords = (records) => {
    allRecords = Array.isArray(records) ? records : [];
    filterAndRender();
  };
  
  wrapper.init = (initialRecords = []) => {
    wrapper.innerHTML = '';
    
    // Create search
    const searchWrapper = createSearchInput();
    wrapper.appendChild(searchWrapper);
    
    // Create table container
    tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    wrapper.appendChild(tableContainer);
    
    // Set initial records
    wrapper.setRecords(initialRecords);
  };
  
  wrapper.getFilteredRecords = () => filteredRecords;
  wrapper.setPager = (pagerInstance) => { pager = pagerInstance; };
  
  return wrapper;
}

// Time input helper for 24-hour format
export function setupTimeInput(input) {
  if (!input) return;
  
  // Format time input as user types
  input.addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^\d]/g, ''); // Only digits
    
    if (value.length >= 2) {
      value = value.substring(0, 2) + ':' + value.substring(2, 4);
    }
    
    e.target.value = value;
  });
  
  // Validate on blur
  input.addEventListener('blur', function(e) {
    const value = e.target.value;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (value && !timeRegex.test(value)) {
      e.target.setCustomValidity('Geçerli saat formatı girin (ÖR: 08:30)');
      e.target.reportValidity();
    } else {
      e.target.setCustomValidity('');
    }
  });
  
  // Clear validation on focus
  input.addEventListener('focus', function(e) {
    e.target.setCustomValidity('');
  });
}

// Setup all time inputs in a container
export function setupTimeInputs(container) {
  const timeInputs = container.querySelectorAll('input[pattern="[0-9]{2}:[0-9]{2}"]');
  timeInputs.forEach(setupTimeInput);
}

// Enhanced data table with full functionality
export function createDataTable(config) {
  const {
    apiBaseUrl,
    endpoints, // { list, activate, deactivate, update }
    columns, // Array of column definitions
    searchFields = [],
    title = 'Data Table',
    emptyMessage = 'Kayıt bulunamadı',
    onDataLoaded = () => {},
    getRowData = (record) => record, // Transform record for editing
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
    const { wrapper: selectorWrap, select: selectElement } = createRowCountSelector(20);
    select = selectElement;

    // Search input
    const searchWrap = document.createElement('div');
    searchWrap.className = 'ml-2';
    searchWrap.innerHTML = `<input type="search" placeholder="Tabloda ara..." class="px-3 py-2 rounded bg-neutral-800 text-neutral-200" />`;
    searchInput = searchWrap.querySelector('input');

    // Filter toggle for active/inactive records
    const filterWrap = document.createElement('div');
    filterWrap.className = 'mt-2';
    filterWrap.innerHTML = `
      <label class="flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" id="show-inactive" ${showInactive ? 'checked' : ''} class="rounded"/>
        Pasif kayıtları da göster
      </label>
    `;
    showInactiveCheckbox = filterWrap.querySelector('#show-inactive');

    // Top row: Row selector and search on right
    const topRow = document.createElement('div');
    topRow.className = 'flex items-center justify-end gap-4 mb-2';
    topRow.appendChild(selectorWrap);
    topRow.appendChild(searchWrap);

    // Bottom row: Filter checkbox
    const bottomRow = document.createElement('div');
    bottomRow.className = 'flex items-center justify-end mb-4';
    bottomRow.appendChild(filterWrap);

    container.appendChild(topRow);
    container.appendChild(bottomRow);

    // Pagination
    pager = createPaginationControls(0, pageSize, currentPage, (p) => {
      currentPage = p;
      renderTable();
    });
    container.appendChild(pager);

    // Debug info
    debugInfo = document.createElement('div');
    debugInfo.className = 'text-sm text-neutral-400 mt-1';
    container.appendChild(debugInfo);

    // Table container
    tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    container.appendChild(tableContainer);

    // Event listeners
    select.addEventListener('change', () => {
      currentPage = 1;
      renderTable();
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderTable();
      });
    }

    showInactiveCheckbox.addEventListener('change', async () => {
      showInactive = showInactiveCheckbox.checked;
      currentPage = 1;
      await loadData();
    });
  }

  // Load data from API
  async function loadData() {
    try {
      const statusParam = showInactive ? 'all' : 'active';
      const url = `${apiBaseUrl}${endpoints.list}?status=${statusParam}`;
      const requestOptions = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      };

      console.log('🔄 LIST REQUEST:', url);
      const response = await fetch(url, requestOptions);
      console.log('📥 LIST RESPONSE:', response.status, response.statusText);

      let apiResponse = null;
      try {
        const responseText = await response.text();
        if (responseText) {
          apiResponse = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error('Response parsing error:', parseError);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      allRecords = apiResponse?.data || [];
      onDataLoaded(allRecords);
      renderTable();

    } catch (err) {
      console.error('❌ LIST ERROR:', err);
      tableContainer.innerHTML = `
        <div class="p-4 text-rose-400">
          <p class="font-semibold mb-2">Veri yüklenirken hata oluştu:</p>
          <p class="text-sm">${err.message}</p>
          <button onclick="this.closest('.table-container').parentElement._reload()" class="mt-3 px-3 py-1 bg-neutral-800 rounded hover:bg-neutral-700">Tekrar Dene</button>
        </div>
      `;
    }
  }

  // Render table with current filters
  function renderTable() {
    const limit = select.value;
    pageSize = (limit === 'all') ? allRecords.length || 1 : Number(limit || 20);

    try {
      pager.update(allRecords.length, pageSize, currentPage);
    } catch (e) {}

    try {
      debugInfo.textContent = `Toplam: ${allRecords.length} (Aktif: ${allRecords.filter(r => r.isActive).length}, Pasif: ${allRecords.filter(r => !r.isActive).length}), SayfaBoyutu: ${pageSize}, Sayfa: ${currentPage}`;
    } catch (e) {}

    // Apply search filter
    const q = (searchInput && searchInput.value || '').trim().toLowerCase();
    const filtered = q ? allRecords.filter(r => {
      return searchFields.some(k => String(r[k] || '').toLowerCase().includes(q));
    }) : allRecords;

    // Apply pagination
    const start = (currentPage - 1) * pageSize;
    const slice = (limit === 'all') ? filtered : filtered.slice(start, start + pageSize);

    renderTableHTML(slice);
  }

  // Render table HTML
  function renderTableHTML(records) {
    const tableHtml = `
      <div class="mt-4">
        <h4 class="text-lg font-medium mb-2">${title} ${showInactive ? '(Tümü)' : '(Sadece Aktif)'}</h4>
        <table class="w-full bg-neutral-900 rounded-lg overflow-hidden">
          <thead class="text-neutral-400">
            <tr>
              <th class="p-2">İşlem</th>
              ${columns.map(col => `<th class="p-2">${col.header}</th>`).join('')}
              <th class="p-2">Aktif</th>
              <th class="p-2">Eklenme Zamanı</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(record => `
              <tr class="border-t border-neutral-700 ${!record.isActive ? 'bg-neutral-700/30' : ''}" data-row-id="${record.id}">
                <td class="p-2">
                  <div class="flex gap-1">
                    ${record.isActive ? 
                      `<button data-id="${record.id}" class="deactivate-btn px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-xs">Pasif Yap</button>` :
                      `<button data-id="${record.id}" class="activate-btn px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-xs">+ Aktif Yap</button>`
                    }
                    <button data-id="${record.id}" class="edit-btn px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs">Güncelle</button>
                  </div>
                </td>
                ${columns.map(col => `
                  <td class="p-2 ${col.className || ''} ${!record.isActive ? 'text-neutral-500' : ''}" data-field="${col.field}">
                    ${col.render ? col.render(record[col.field], record) : (record[col.field] || '')}
                  </td>
                `).join('')}
                <td class="p-2">${record.isActive ? '<span class="text-green-400">Evet</span>' : '<span class="text-red-400">Hayır</span>'}</td>
                <td class="p-2 text-neutral-400 text-xs">${record.addedDateTime ? new Date(record.addedDateTime).toLocaleString('tr-TR') : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    tableContainer.innerHTML = tableHtml;
    attachEventHandlers();
  }

  // Attach event handlers to buttons
  function attachEventHandlers() {
    // Deactivate buttons
    tableContainer.querySelectorAll('.deactivate-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        showToast('Kayıt pasif hale getiriliyor...', 'warning');

        btn.disabled = true;
        btn.textContent = 'Pasif yapılıyor...';

        try {
          const url = `${apiBaseUrl}${endpoints.deactivate.replace('{id}', id)}`;
          const response = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
          }

          showToast('Kayıt pasif hale getirildi', 'success');
          await loadData();

        } catch (err) {
          console.error('❌ DEACTIVATE ERROR:', err);
          showToast('Pasif yapma hatası: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Pasif Yap';
        }
      });
    });

    // Activate buttons
    tableContainer.querySelectorAll('.activate-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        showToast('Kayıt aktif hale getiriliyor...', 'warning');

        btn.disabled = true;
        btn.textContent = 'Aktif yapılıyor...';

        try {
          const url = `${apiBaseUrl}${endpoints.activate.replace('{id}', id)}`;
          const response = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
          }

          showToast('Kayıt aktif hale getirildi', 'success');
          await loadData();

        } catch (err) {
          console.error('❌ ACTIVATE ERROR:', err);
          showToast('Aktif yapma hatası: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = '+ Aktif Yap';
        }
      });
    });

    // Edit buttons
    tableContainer.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const row = btn.closest('tr');

        // Make other rows faded
        tableContainer.querySelectorAll('tr').forEach(tr => {
          if (tr !== row) {
            tr.style.opacity = '0.3';
            tr.style.pointerEvents = 'none';
          }
        });

        enableRowEdit(row, id);
      });
    });
  }

  // Enable inline editing for a row
  function enableRowEdit(row, id) {
    const record = allRecords.find(r => r.id == id);
    if (!record) return;

    const actionCell = row.querySelector('td:first-child div');
    const editableFields = {};
    const editableColumns = columns.filter(col => col.editable); // Define editableColumns

    // Convert editable columns to inputs
    editableColumns.forEach(col => {
        const cell = row.querySelector(`[data-field="${col.field}"]`);
        const originalValue = record[col.field] || '';
        
        // Different input types based on field configuration
        if (col.editType === 'textarea' || col.field === 'description') {
          const rows = col.editType === 'textarea' ? (col.rows || 2) : 2;
          cell.innerHTML = `<textarea class="w-full px-2 py-1 bg-neutral-700 rounded text-xs" rows="${rows}" data-field="${col.field}">${originalValue}</textarea>`;
          editableFields[col.field] = cell.querySelector('textarea');
        } else if (col.editType === 'select' && col.options) {
          // Create select dropdown for specific fields
          const optionsHtml = col.options.map(opt => 
            `<option value="${opt.value}" ${opt.value === originalValue ? 'selected' : ''}>${opt.label}</option>`
          ).join('');
          cell.innerHTML = `<select class="w-full px-2 py-1 bg-neutral-700 rounded text-xs" data-field="${col.field}">${optionsHtml}</select>`;
          editableFields[col.field] = cell.querySelector('select');
        } else if (col.editType === 'operationSelect' && col.getOperations) {
          // Special case for operation selection - dynamically load operations
          cell.innerHTML = `<select class="w-full px-2 py-1 bg-neutral-700 rounded text-xs" data-field="${col.field}"><option value="">Yükleniyor...</option></select>`;
          const select = cell.querySelector('select');
          editableFields[col.field] = select;
          
          // Load operations dynamically
          col.getOperations().then(operations => {
            const optionsHtml = operations.map(op => 
              `<option value="${op.id}" ${op.id == record.lastOperationId ? 'selected' : ''}>${op.name} (${op.shortCode})</option>`
            ).join('');
            select.innerHTML = `<option value="">Operasyon seçiniz...</option>${optionsHtml}`;
          }).catch(err => {
            console.error('Failed to load operations:', err);
            select.innerHTML = '<option value="">Operasyon yüklenemedi</option>';
          });
        } else {
          cell.innerHTML = `<input type="text" value="${originalValue}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs" data-field="${col.field}">`;
          editableFields[col.field] = cell.querySelector('input');
        }
    });

    // Replace action buttons with save/cancel
    actionCell.innerHTML = `
      <div class="flex gap-1">
        <button class="save-btn px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-xs">Kaydet</button>
        <button class="cancel-btn px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 text-xs">İptal</button>
      </div>
    `;

    // Save button handler
    actionCell.querySelector('.save-btn').addEventListener('click', async () => {
      const newData = {};
      
      // Collect data from inputs
      Object.keys(editableFields).forEach(field => {
        const value = editableFields[field].value.trim();
        
        // Special field mapping for operation selection
        if (field === 'lastOperationName') {
          newData['lastOperationId'] = value ? parseInt(value) : null; // Convert to integer
        } else {
          newData[field] = value;
        }
      });

      // Add existing non-editable data to preserve it
      editableColumns.forEach(col => {
        if (!editableFields[col.field] && record[col.field] !== undefined) {
          newData[col.field] = record[col.field];
        }
      });

      // Validate data
      const validation = validateRowData(newData);
      if (!validation.isValid) {
        showToast(validation.errors.join(', '), 'error');
        return;
      }

      await updateRecord(id, newData);
    });

    // Cancel button handler
    actionCell.querySelector('.cancel-btn').addEventListener('click', () => {
      restoreRowNormalState();
    });
  }

  // Restore all rows to normal state
  function restoreRowNormalState() {
    tableContainer.querySelectorAll('tr').forEach(tr => {
      tr.style.opacity = '1';
      tr.style.pointerEvents = 'auto';
    });
    renderTable();
  }

  // Update a record via API
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
      restoreRowNormalState();
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
  container._reload = loadData; // For button onclick

  return container;
}
