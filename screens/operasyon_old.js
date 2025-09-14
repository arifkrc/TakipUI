import { createDataTable, showToast, showFormErrors, clearFormErrors } from '../ui/helpers.js';
let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Operasyonlar', 'Operasyon tanımları');

  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Operasyon Ekle</h3>
      </br>
      <form id="operasyon-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <label class="flex flex-col text-sm">Operasyon Kodu<input name="operasyonKodu" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
          <label class="flex flex-col text-sm">Operasyon Adı<input name="operasyonAdi" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Kaydet</button>
          </br></br></br>
          <button type="button" id="operasyon-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="operasyon-list-placeholder"></div>
    </div>
  `;

  const form = container.querySelector('#operasyon-form');
  const placeholder = container.querySelector('#operasyon-list-placeholder');

  // API configuration
  const API_BASE_URL = 'https://localhost:7287/api';

  async function submitHandler(e) {
    e.preventDefault();
    clearFormErrors(form);
    
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    const errors = [];
    if (!data.operasyonKodu) errors.push({ field: 'operasyonKodu', msg: 'Operasyon kodu gerekli' });
    if (!data.operasyonAdi) errors.push({ field: 'operasyonAdi', msg: 'Operasyon adı gerekli' });
    
    if (errors.length) { 
      showFormErrors(form, errors); 
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; 
    submitBtn.textContent = 'Kaydediliyor...';
    
    try {
      const payload = {
        name: data.operasyonAdi,
        shortCode: data.operasyonKodu
      };

      const url = `${API_BASE_URL}/Operations/entry`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${responseText}`);
      }
      
      showToast('Operasyon kaydedildi', 'success');
      form.reset();
      await dataTable.reload();
      
    } catch (err) {
      console.error('❌ CREATE OPERATION ERROR:', err);
      showToast('Kaydetme hatası: ' + err.message, 'error');
    } finally { 
      submitBtn.disabled = false; 
      submitBtn.textContent = 'Kaydet'; 
    }
  }

  function resetHandler() { 
    form.reset(); 
  }

  form.addEventListener('submit', submitHandler);
  container.querySelector('#operasyon-reset').addEventListener('click', resetHandler);

  // Create data table with configuration
  const dataTable = createDataTable({
    apiBaseUrl: API_BASE_URL,
    endpoints: {
      list: '/Operations',
      activate: '/Operations/{id}/activate',
      deactivate: '/Operations/{id}/deactivate',
      update: '/Operations/{id}'
    },
    columns: [
      {
        field: 'shortCode',
        header: 'Operasyon Kodu',
        className: 'font-mono',
        editable: true
      },
      {
        field: 'name',
        header: 'Operasyon Adı',
        editable: true
      }
    ],
    searchFields: ['shortCode', 'name'],
    title: 'Tanımlı Operasyonlar',
    validateRowData: (data) => {
      const errors = [];
      if (!data.shortCode) errors.push('Operasyon kodu gerekli');
      if (!data.name) errors.push('Operasyon adı gerekli');
      return { isValid: errors.length === 0, errors };
    },
    formatPayload: (data) => ({
      name: data.name,
      shortCode: data.shortCode
    })
  });

  placeholder.appendChild(dataTable);
  await dataTable.init();

  _cleanup = () => {
    try { form.removeEventListener('submit', submitHandler); } catch(e){}
    try { const resetBtn = container.querySelector('#operasyon-reset'); if (resetBtn) resetBtn.removeEventListener('click', resetHandler); } catch(e){}
    try { container.innerHTML = ''; } catch(e){}
    _cleanup = null;
  };
}

export async function unmount(container) { 
  if (_cleanup) _cleanup(); 
}
    
    try {
      // API'ye status parametresi gönder: 'active' (default), 'all' (tümü)
      const statusParam = showInactive ? 'all' : 'active';
      const url = `${API_BASE_URL}/Operations?status=${statusParam}`;
      const requestOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      };

      console.log('🔄 LIST OPERATIONS REQUEST:');
      console.log('URL:', url);
      console.log('Status Filter:', statusParam);
      console.log('Show Inactive:', showInactive);
      console.log('Method:', requestOptions.method);
      console.log('Headers:', requestOptions.headers);

      const response = await fetch(url, requestOptions);

      console.log('📥 LIST OPERATIONS RESPONSE:');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      console.log('OK:', response.ok);

      let apiResponse = null;
      try {
        const responseText = await response.text();
        console.log('Response Body (raw):', responseText);
        
        if (responseText) {
          try {
            apiResponse = JSON.parse(responseText);
            console.log('Response Body (parsed):', apiResponse);
          } catch (parseError) {
            console.log('Response Body (not JSON):', responseText);
          }
        }
      } catch (bodyError) {
        console.error('Error reading response body:', bodyError);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${apiResponse ? JSON.stringify(apiResponse) : 'No response body'}`);
      }

      const records = apiResponse?.data || [];

      const { wrapper: selectorWrap, select } = createRowCountSelector(20);
      const searchWrap = document.createElement('div');
      searchWrap.className = 'ml-2';
      searchWrap.innerHTML = `<input type="search" placeholder="Tabloda ara..." class="px-3 py-2 rounded bg-neutral-800 text-neutral-200" />`;
      const searchInput = searchWrap.querySelector('input');

      // Filter toggle for active/inactive operations
      const filterWrap = document.createElement('div');
      filterWrap.className = 'mt-2';
      filterWrap.innerHTML = `
        <label class="flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" id="show-inactive" ${showInactive ? 'checked' : ''} class="rounded"/>
          Pasif operasyonları da göster
        </label>
      `;
      const showInactiveCheckbox = filterWrap.querySelector('#show-inactive');

      placeholder.innerHTML = '';
      
      // Üst satır: Row selector ve search sağ tarafta
      const topRow = document.createElement('div'); 
      topRow.className = 'flex items-center justify-end gap-4 mb-2'; 
      topRow.appendChild(selectorWrap);
      topRow.appendChild(searchWrap);
      
      // Alt satır: Filter checkbox
      const bottomRow = document.createElement('div');
      bottomRow.className = 'flex items-center justify-end mb-4';
      bottomRow.appendChild(filterWrap);
      
      placeholder.appendChild(topRow);
      placeholder.appendChild(bottomRow);

      let pageSize = (select.value === 'all') ? records.length || 1 : Number(select.value || 20);
      let currentPage = 1;
      const pager = createPaginationControls(records.length, pageSize, currentPage, (p) => { currentPage = p; renderTable(); });
      placeholder.appendChild(pager);
      const debugInfo = document.createElement('div'); 
      debugInfo.className = 'text-sm text-neutral-400 mt-1'; 
      placeholder.appendChild(debugInfo);

      // Row edit functionality
      function enableRowEdit(row, id) {
        const shortCodeCell = row.querySelector('[data-field="shortCode"]');
        const nameCell = row.querySelector('[data-field="name"]');
        const actionCell = row.querySelector('td:first-child div');
        
        const originalShortCode = shortCodeCell.textContent;
        const originalName = nameCell.textContent;
        
        // Input alanlarına dönüştür
        shortCodeCell.innerHTML = `<input type="text" value="${originalShortCode}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs" data-field="shortCode">`;
        nameCell.innerHTML = `<input type="text" value="${originalName}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs" data-field="name">`;
        
        // Kaydet/İptal butonları
        actionCell.innerHTML = `
          <div class="flex gap-1">
            <button class="save-btn px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-xs">Kaydet</button>
            <button class="cancel-btn px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 text-xs">İptal</button>
          </div>
        `;
        
        // Kaydet butonu event handler
        actionCell.querySelector('.save-btn').addEventListener('click', async () => {
          const newShortCode = shortCodeCell.querySelector('input').value.trim();
          const newName = nameCell.querySelector('input').value.trim();
          
          if (!newShortCode || !newName) {
            showToast('Operasyon kodu ve adı gerekli', 'error');
            return;
          }
          
          await updateOperation(id, newShortCode, newName);
        });
        
        // İptal butonu event handler
        actionCell.querySelector('.cancel-btn').addEventListener('click', () => {
          restoreRowNormalState();
        });
      }
      
      // Row'u normal haline döndür
      function restoreRowNormalState() {
        // Tüm satırları normale döndür
        placeholder.querySelectorAll('tr').forEach(tr => {
          tr.style.opacity = '1';
          tr.style.pointerEvents = 'auto';
        });
        
        // Tabloyu yeniden render et
        renderTable();
      }
      
      // Operasyon güncelleme fonksiyonu
      async function updateOperation(id, shortCode, name) {
        try {
          const payload = {
            name: name,
            shortCode: shortCode
          };

          const url = `${API_BASE_URL}/Operations/${id}`;
          const requestOptions = {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          };

          console.log('🔄 UPDATE OPERATION REQUEST:');
          console.log('URL:', url);
          console.log('Method:', requestOptions.method);
          console.log('Headers:', requestOptions.headers);
          console.log('Payload:', payload);

          const response = await fetch(url, requestOptions);

          console.log('📥 UPDATE OPERATION RESPONSE:');
          console.log('Status:', response.status);
          console.log('Status Text:', response.statusText);
          console.log('OK:', response.ok);

          let result = null;
          try {
            const responseText = await response.text();
            if (responseText) {
              result = JSON.parse(responseText);
              console.log('Response Body:', result);
            }
          } catch (parseError) {
            console.log('Response parsing error:', parseError);
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}: ${result ? JSON.stringify(result) : 'No response body'}`);
          }

          showToast('Operasyon başarıyla güncellendi', 'success');
          restoreRowNormalState();
          await loadList(); // Listeyi yenile
          
        } catch (err) {
          console.error('❌ UPDATE OPERATION ERROR:');
          console.error('Error Type:', err.constructor.name);
          console.error('Error Message:', err.message);
          console.error('Error Stack:', err.stack);
          showToast('Güncelleme hatası: ' + err.message, 'error');
        }
      }

      const renderTable = () => {
        const limit = select.value;
        
        // API'den zaten filtrelenmiş data geliyor, client-side filtreleme gereksiz
        const filteredByStatus = records;
        
        pageSize = (limit === 'all') ? filteredByStatus.length || 1 : Number(limit || 20);
        try { pager.update(filteredByStatus.length, pageSize, currentPage); } catch(e) {}
        try { debugInfo.textContent = `\n Toplam: ${filteredByStatus.length} (Aktif: ${records.filter(r => r.isActive).length}, Pasif: ${records.filter(r => !r.isActive).length}), SayfaBoyutu: ${pageSize}, Sayfa: ${currentPage}`; } catch(e) {}
        
        const q = (searchInput && searchInput.value || '').trim().toLowerCase();
        const filtered = q ? filteredByStatus.filter(r => {
          return ['shortCode','name'].some(k => String(r[k] || '').toLowerCase().includes(q));
        }) : filteredByStatus;
        
        const start = (currentPage - 1) * pageSize;
        const slice = (limit === 'all') ? filtered : filtered.slice(start, start + pageSize);
        
        const html = `
          <div class="mt-4">
            <h4 class="text-lg font-medium mb-2">Tanımlı Operasyonlar ${showInactive ? '(Tümü)' : '(Sadece Aktif)'}</h4>
            <div class="overflow-auto bg-neutral-800 p-2 rounded">
              <table class="w-full text-left text-sm">
                <thead class="text-neutral-400">
                  <tr>
                    <th class="p-2">İşlem</th>
                    <th class="p-2">Operasyon Kodu</th>
                    <th class="p-2">Operasyon Adı</th>
                    <th class="p-2">Aktif</th>
                    <th class="p-2">Eklenme Zamanı</th>
                  </tr>
                </thead>
                <tbody>
                  ${slice.map(r => `
                    <tr class="border-t border-neutral-700 ${!r.isActive ? 'bg-neutral-700/30' : ''}" data-row-id="${r.id}">
                      <td class="p-2">
                        <div class="flex gap-1">
                          ${r.isActive ? 
                            `<button data-id="${r.id}" class="deactivate-btn px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-xs">Pasif Yap</button>` :
                            `<button data-id="${r.id}" class="activate-btn px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-xs">+ Aktif Yap</button>`
                          }
                          <button data-id="${r.id}" class="edit-btn px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs">Güncelle</button>
                        </div>
                      </td>
                      <td class="p-2 font-mono ${!r.isActive ? 'text-neutral-500' : ''}" data-field="shortCode">${r.shortCode || ''}</td>
                      <td class="p-2 ${!r.isActive ? 'text-neutral-500' : ''}" data-field="name">${r.name || ''}</td>
                      <td class="p-2">${r.isActive ? '<span class="text-green-400">Evet</span>' : '<span class="text-red-400">Hayır</span>'}</td>
                      <td class="p-2 text-neutral-400">${r.addedDateTime ? new Date(r.addedDateTime).toLocaleString('tr-TR') : ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
        
        const existingTable = placeholder.querySelector('.mt-4');
        if (existingTable) existingTable.outerHTML = html; 
        else placeholder.insertAdjacentHTML('beforeend', html);
        
        try { pager.update(filtered.length, pageSize, currentPage); } catch(e) {}
        
        // Wire deactivate buttons (for active operations)
        placeholder.querySelectorAll('.deactivate-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = parseInt(btn.getAttribute('data-id'));
            if (!id) return;
            
            if (!confirm('Bu operasyonu pasif hale getirmek istediğinizden emin misiniz?')) return;
            
            btn.disabled = true;
            btn.textContent = 'Pasif yapılıyor...';
            
            try {
              const url = `${API_BASE_URL}/Operations/${id}/deactivate`;
              const requestOptions = {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                }
              };

              console.log('🔄 DEACTIVATE REQUEST:');
              console.log('URL:', url);
              console.log('Method:', requestOptions.method);
              console.log('Headers:', requestOptions.headers);
              console.log('Operation ID:', id);

              const response = await fetch(url, requestOptions);

              console.log('📥 DEACTIVATE RESPONSE:');
              console.log('Status:', response.status);
              console.log('Status Text:', response.statusText);
              console.log('Headers:', Object.fromEntries(response.headers.entries()));
              console.log('OK:', response.ok);

              // Try to read response body
              let responseBody = null;
              try {
                const responseText = await response.text();
                console.log('Response Body (raw):', responseText);
                
                if (responseText) {
                  try {
                    responseBody = JSON.parse(responseText);
                    console.log('Response Body (parsed):', responseBody);
                  } catch (parseError) {
                    console.log('Response Body (not JSON):', responseText);
                  }
                }
              } catch (bodyError) {
                console.error('Error reading response body:', bodyError);
              }

              if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}: ${responseBody ? JSON.stringify(responseBody) : 'No response body'}`);
              }
              
              showToast('Operasyon pasif hale getirildi', 'success');
              await loadList();
              
            } catch (err) {
              console.error('❌ DEACTIVATE ERROR:');
              console.error('Error Type:', err.constructor.name);
              console.error('Error Message:', err.message);
              console.error('Error Stack:', err.stack);
              showToast('Pasif yapma hatası: ' + err.message, 'error');
              btn.disabled = false;
              btn.textContent = 'Pasif Yap';
            }
          });
        });

        // Wire activate buttons (for inactive operations)
        placeholder.querySelectorAll('.activate-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = parseInt(btn.getAttribute('data-id'));
            if (!id) return;
            
            if (!confirm('Bu operasyonu aktif hale getirmek istediğinizden emin misiniz?')) return;
            
            btn.disabled = true;
            btn.textContent = 'Aktif yapılıyor...';
            
            try {
              const url = `${API_BASE_URL}/Operations/${id}/activate`;
              const requestOptions = {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                }
              };

              console.log('🔄 ACTIVATE REQUEST:');
              console.log('URL:', url);
              console.log('Method:', requestOptions.method);
              console.log('Headers:', requestOptions.headers);
              console.log('Operation ID:', id);

              const response = await fetch(url, requestOptions);

              console.log('📥 ACTIVATE RESPONSE:');
              console.log('Status:', response.status);
              console.log('Status Text:', response.statusText);
              console.log('Headers:', Object.fromEntries(response.headers.entries()));
              console.log('OK:', response.ok);

              // Try to read response body
              let responseBody = null;
              try {
                const responseText = await response.text();
                console.log('Response Body (raw):', responseText);
                
                if (responseText) {
                  try {
                    responseBody = JSON.parse(responseText);
                    console.log('Response Body (parsed):', responseBody);
                  } catch (parseError) {
                    console.log('Response Body (not JSON):', responseText);
                  }
                }
              } catch (bodyError) {
                console.error('Error reading response body:', bodyError);
              }

              if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}: ${responseBody ? JSON.stringify(responseBody) : 'No response body'}`);
              }
              
              showToast('Operasyon aktif hale getirildi', 'success');
              await loadList();
              
            } catch (err) {
              console.error('❌ ACTIVATE ERROR:');
              console.error('Error Type:', err.constructor.name);
              console.error('Error Message:', err.message);
              console.error('Error Stack:', err.stack);
              showToast('Aktif yapma hatası: ' + err.message, 'error');
              btn.disabled = false;
              btn.textContent = '+ Aktif Yap';
            }
          });
        });
        
        // Wire edit buttons 
        placeholder.querySelectorAll('.edit-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const row = btn.closest('tr');
            
            // Diğer satırları soluk yap
            placeholder.querySelectorAll('tr').forEach(tr => {
              if (tr !== row) {
                tr.style.opacity = '0.3';
                tr.style.pointerEvents = 'none';
              }
            });
            
            // Bu satırı düzenlenebilir hale getir
            enableRowEdit(row, id);
          });
        });
      };

      pager.update(records.length, pageSize, currentPage);
      renderTable();
      
      // Event listeners
      select.addEventListener('change', () => { 
        currentPage = 1; 
        renderTable(); 
      });
      
      if (searchInput) searchInput.addEventListener('input', () => { 
        currentPage = 1; 
        renderTable(); 
      });

      // Toggle for showing inactive operations
      // Toggle for showing inactive operations - API'yi yeniden çağır
      showInactiveCheckbox.addEventListener('change', async () => {
        showInactive = showInactiveCheckbox.checked;
        currentPage = 1;
        await loadList(); // API'yi yeniden çağır
      });

    } catch (err) {
      console.error('❌ LIST OPERATIONS ERROR:');
      console.error('Error Type:', err.constructor.name);
      console.error('Error Message:', err.message);
      console.error('Error Stack:', err.stack);
      placeholder.innerHTML = `
        <div class="text-rose-400 p-4">
          <div class="font-semibold">Veri yüklenirken hata oluştu:</div>
          <div class="mt-2">${err.message}</div>
          <button onclick="loadList()" class="mt-3 px-3 py-1 bg-neutral-800 rounded hover:bg-neutral-700">Tekrar Dene</button>
        </div>
      `;
      showToast('Veri yükleme hatası: ' + err.message, 'error');
    }
  }

  await loadList();

  _cleanup = () => {
    try { form.removeEventListener('submit', submitHandler); } catch(e){}
    try { const resetBtn = container.querySelector('#operasyon-reset'); if (resetBtn) resetBtn.removeEventListener('click', resetHandler); } catch(e){}
    try { container.innerHTML = ''; } catch(e){}
    _cleanup = null;
  };
}

export async function unmount(container) { 
  if (_cleanup) _cleanup(); 
}
