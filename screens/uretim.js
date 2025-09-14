import { showToast, showFormErrors, clearFormErrors, createRowCountSelector, createPaginationControls, createStagingControls, setupTimeInputs } from '../ui/helpers.js';

let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Üretim', 'Günlük üretim verileri');
  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Üretim Kayıt Formu</h3>
      <form id="uretim-form" class="space-y-4"> 
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Tarih<input name="tarih" type="date" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
          <label class="flex flex-col text-sm">Vardiya<select name="vardiya" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100"><option>1 00-08</option><option>2 08-16</option><option>3 16-24</option></select></label>
          <label class="flex flex-col text-sm">Üstabaşı<input name="ustabasi" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Bölüm Sorumlusu<input name="bolum" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Operator<input name="operator" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Ürün Kodu<input name="urunKodu" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-5 gap-4">
          <label class="flex flex-col text-sm">Operasyon Kodu<input name="operasyonKodu" id="operasyon-kod-input" type="text" maxlength="2" placeholder="01" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100 text-center font-mono" /></label>
          <label class="flex flex-col text-sm">Operasyon Türü<select name="operasyonTuru" id="operasyon-select" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100"><option value="">Seçiniz...</option></select></label>
          <label class="flex flex-col text-sm">Üretim Adedi<input name="uretimAdedi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">İş Başlangıç<input name="baslangic" type="text" pattern="[0-9]{2}:[0-9]{2}" placeholder="08:30" inputmode="numeric" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">İş Bitiş<input name="bitis" type="text" pattern="[0-9]{2}:[0-9]{2}" placeholder="17:30" inputmode="numeric" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-4 gap-4">
          <label class="flex flex-col text-sm">Döküm Hatası<input name="dokumHatasi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Operatör Hatası<input name="operatorHatasi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Tezgah Arızası<input name="tezgahArizasi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Tezgah Ayarı<input name="tezgahAyari" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-4 gap-4">
          <label class="flex flex-col text-sm">Elmas Değişimi<input name="elmasDegisimi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Parça Bekleme<input name="parcaBekleme" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Temizlik<input name="temizlik" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Mola<input name="mola" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-green-600 hover:bg-green-500">Kaydet</button>
          <button type="button" id="uretim-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="staging-controls-placeholder"></div>
      
      <!-- Local Kayıtlar Tablosu -->
      <div id="local-records-table" class="mt-6 border border-yellow-500 rounded-lg">
        <h3 class="text-xl font-semibold mb-3 text-yellow-400 px-4 pt-4">📋 Local Kayıtlar</h3>
        <div id="local-table-content" class="bg-neutral-800 p-3 rounded-lg mx-4 mb-4" style="min-height: 100px;">
          <p class="text-neutral-400 text-center py-4">Yükleniyor...</p>
        </div>
      </div>

      <div id="uretim-list-placeholder"></div>
    </div>
  `;

  const form = container.querySelector('#uretim-form');
  const stagingPlaceholder = container.querySelector('#staging-controls-placeholder');
  const listPlaceholder = container.querySelector('#uretim-list-placeholder');

  // Create staging controls
  const stagingControls = createStagingControls('uretim', {
    onAddLocal: async () => {
      clearFormErrors(form);
      const data = Object.fromEntries(new FormData(form).entries());
      ['uretimAdedi','dokumHatasi','operatorHatasi','tezgahArizasi','tezgahAyari','elmasDegisimi','parcaBekleme','temizlik','mola'].forEach(k => { if (data[k] !== undefined) data[k] = Number(data[k]) || 0; });

      const errors = [];
      if (!data.tarih) errors.push({ field: 'tarih', msg: 'Tarih gerekli' });
      if (!data.operator) errors.push({ field: 'operator', msg: 'Operator girin' });
      if (errors.length) { 
        showFormErrors(form, errors); 
        throw new Error('Form validation failed');
      }

      await window.api.stagingAdd('uretim', data);
      showToast('Kayıt local\'e eklendi', 'success');
      form.reset();
      setDefaultDate();
      await renderLocalRecords(); // Local tabloyu yenile
    },
    onUploadAll: async () => {
      // Get staged data first
      const stagedRecords = await window.api.stagingList('uretim');
      if (!stagedRecords || stagedRecords.length === 0) {
        showToast('Yüklenecek local kayıt bulunamadı', 'info');
        return { ok: true, uploaded: 0 };
      }

      try {
        // Transform data to API format
        const items = stagedRecords.map(record => {
          // Parse time strings (HH:MM) and create datetime objects
          const parseTimeToDateTime = (timeStr, baseDate) => {
            if (!timeStr || !baseDate) return new Date().toISOString();
            const [hours, minutes] = timeStr.split(':').map(Number);
            const datetime = new Date(baseDate);
            datetime.setHours(hours || 0, minutes || 0, 0, 0);
            return datetime.toISOString();
          };

          // Get operationTypeId - prefer saved ID, fallback to finding by code
          let operationTypeId = 0;
          if (record.operasyonId) {
            operationTypeId = record.operasyonId;
          } else if (record.operasyonKodu) {
            const operation = operationsData.find(op => op.operationCode === record.operasyonKodu);
            operationTypeId = operation ? operation.id : 0;
          }

          // Parse shift number from vardiya (e.g., "1 00-08" -> 1)
          const shiftMatch = record.vardiya ? record.vardiya.match(/^(\d+)/) : null;
          const shift = shiftMatch ? parseInt(shiftMatch[1]) : 1;

          const baseDate = record.tarih || new Date().toISOString().split('T')[0];
          const baseDatetime = new Date(baseDate + 'T00:00:00.000Z');

          return {
            productId: 0, // Will be handled by backend
            operationTypeId: operationTypeId,
            supervisor: record.ustabasi || "",
            date: baseDatetime.toISOString(),
            shift: shift,
            lineNumber: 0, // Not in form, default value
            machineNumber: "", // Not in form
            operator: record.operator || "",
            departmentSupervisor: record.bolum || "",
            productCode: record.urunKodu || "",
            productionQuantity: record.uretimAdedi || 0,
            castingError: record.dokumHatasi || 0,
            operatorError: record.operatorHatasi || 0,
            machineFailure: record.tezgahArizasi || 0,
            machineAdjustment: record.tezgahAyari || 0,
            diamondChange: record.elmasDegisimi || 0,
            partWaiting: record.parcaBekleme || 0,
            cleaning: record.temizlik || 0,
            workStart: parseTimeToDateTime(record.baslangic, baseDate),
            workEnd: parseTimeToDateTime(record.bitis, baseDate),
            isActive: true
          };
        });

        // Send to API
        const response = await fetch('https://localhost:7196/api/Utf/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ items })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Clear staging on success
        await window.api.stagingClear('uretim');
        
        showToast(`${items.length} kayıt başarıyla DB'ye yüklendi`, 'success');
        return { ok: true, uploaded: items.length };
        
      } catch (error) {
        console.error('Bulk upload error:', error);
        showToast('DB\'ye yükleme başarısız: ' + error.message, 'error');
        return { ok: false, uploaded: 0, error: error.message };
      }
    },
    onClearAll: async () => {
      await window.api.stagingClear('uretim');
    },
    refreshCallback: async () => {
      await loadList();
      await renderLocalRecords(); // Local tabloyu da yenile
    }
  });
  
  stagingPlaceholder.appendChild(stagingControls);

  function setDefaultDate() {
    const dateInput = form.querySelector('[name="tarih"]');
    if (dateInput && !dateInput.value) {
      const today = new Date();
      dateInput.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    }
  }

  setDefaultDate();

  // Setup time inputs for 24-hour format
  setupTimeInputs(container);

  // Load operation types
  let operationsData = [];
  
  async function loadOperationTypes() {
    try {
      // Fetch from API endpoint directly
      const response = await fetch('https://localhost:7196/api/OperationType?onlyActive=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      operationsData = data;
      console.log('Loaded operations:', operationsData); // Debug log
      
      const select = container.querySelector('#operasyon-select');
      if (select) {
        // Clear existing options
        select.innerHTML = '<option value="">Seçiniz...</option>';
        
        // Add all operation options for display
        operationsData.forEach(op => {
          const option = document.createElement('option');
          // Use ID as value but display code-name
          option.value = op.id;
          option.dataset.code = op.operationCode;
          option.textContent = `${op.operationCode} - ${op.operationName}`;
          select.appendChild(option);
        });
        
        // Make it clickable for selection
        select.style.pointerEvents = 'auto';
        select.style.cursor = 'pointer';
      }
    } catch (err) {
      console.error('Operation types load error:', err);
      showToast('Operasyon türleri yüklenemedi', 'error');
    }
  }

  // Setup operation code input auto-complete
  function setupOperationCodeInput() {
    const codeInput = container.querySelector('#operasyon-kod-input');
    const select = container.querySelector('#operasyon-select');
    
    if (!codeInput || !select) return;
    
    // Real-time matching as user types in code input
    codeInput.addEventListener('input', function(e) {
      let code = e.target.value.trim();
      
      // Limit to 2 characters and only allow numbers
      if (code.length > 2) {
        code = code.substring(0, 2);
        e.target.value = code;
      }
      
      // Find matching operation by code
      const matchedOp = operationsData.find(op => 
        op.operationCode && op.operationCode === code
      );
      
      if (matchedOp && code.length > 0) {
        // Set select value to operation ID and show matched operation
        select.value = matchedOp.id;
        select.style.color = '#e5e7eb'; // text-neutral-200
      } else {
        // Reset select if no match
        select.value = '';
        select.style.color = '#9ca3af'; // text-neutral-400
      }
    });
    
    // Auto-format and validate on focus out
    codeInput.addEventListener('blur', function(e) {
      let code = e.target.value.trim();
      if (code.length > 2) {
        code = code.substring(0, 2);
      }
      // Pad with leading zero if single digit
      if (code.length === 1 && /^\d$/.test(code)) {
        code = '0' + code;
      }
      e.target.value = code;
      
      // Final validation
      if (code.length > 0) {
        const matchedOp = operationsData.find(op => 
          op.operationCode && op.operationCode === code
        );
        
        if (matchedOp) {
          showToast(`✓ ${matchedOp.operationName}`, 'success');
          select.value = matchedOp.id; // Set the ID in select
        } else {
          showToast('Operasyon kodu bulunamadı', 'error');
          select.value = '';
        }
      }
    });
    
    // Only allow numeric characters in code input
    codeInput.addEventListener('keypress', function(e) {
      const char = e.key;
      if (!/[0-9]/.test(char) && char !== 'Backspace' && char !== 'Delete') {
        e.preventDefault();
      }
    });
    
    // Handle combobox selection - update code input when user selects from dropdown
    select.addEventListener('change', function(e) {
      const selectedId = e.target.value;
      if (selectedId && selectedId !== '') {
        const selectedOp = operationsData.find(op => op.id == selectedId);
        if (selectedOp) {
          codeInput.value = selectedOp.operationCode;
          showToast(`✓ ${selectedOp.operationName}`, 'success');
        }
      } else {
        codeInput.value = '';
      }
    });
  }

  // Load operation types on mount
  loadOperationTypes().then(() => {
    setupOperationCodeInput();
  });

  // handlers with references so they can be removed on unmount
  async function submitHandler(e) {
    e.preventDefault();
    clearFormErrors(form);
    const data = Object.fromEntries(new FormData(form).entries());
    ['uretimAdedi','dokumHatasi','operatorHatasi','tezgahArizasi','tezgahAyari','elmasDegisimi','parcaBekleme','temizlik','mola'].forEach(k => { if (data[k] !== undefined) data[k] = Number(data[k]) || 0; });

    const errors = [];
    if (!data.tarih) errors.push({ field: 'tarih', msg: 'Tarih gerekli' });
    if (!data.operator) errors.push({ field: 'operator', msg: 'Operator girin' });
    if (errors.length) { showFormErrors(form, errors); return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Kaydediliyor...';
    
    try {
      const keepDate = (form.querySelector('[name="tarih"]') || {}).value || '';
      const keepVardiya = (form.querySelector('[name="vardiya"]') || {}).value || '';
      const keepUstabasi = (form.querySelector('[name="ustabasi"]') || {}).value || '';

      // Get selected operation details
      const select = form.querySelector('#operasyon-select');
      const selectedOperationId = select ? select.value : '';
      const selectedOperation = operationsData.find(op => op.id == selectedOperationId);
      
      // Add operation details to data
      if (selectedOperation) {
        data.operasyonId = selectedOperation.id;
        data.operasyonKodu = selectedOperation.operationCode;
        data.operasyonAdi = selectedOperation.operationName;
      }

      // Save to local CSV staging instead of directly to API
      await window.api.stagingAdd('uretim', data);
      
      showToast('Kayıt listeye eklendi', 'success');
      form.reset();
      // restore
      form.querySelector('[name="tarih"]').value = keepDate;
      form.querySelector('[name="vardiya"]').value = keepVardiya;
      form.querySelector('[name="ustabasi"]').value = keepUstabasi;
      loadList();
      renderLocalRecords(); // Local tabloyu da yenile
      
    } catch (err) {
      showToast('Kaydetme hatası: ' + String(err), 'error');
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = 'Kaydet';
    }
  }

  function resetHandler() { form.reset(); setDefaultDate(); }

  form.addEventListener('submit', submitHandler);
  container.querySelector('#uretim-reset').addEventListener('click', resetHandler);

  // Local kayıtları göster
  async function renderLocalRecords() {
    console.log('renderLocalRecords called'); // Debug
    
    const localTableContent = container.querySelector('#local-table-content');
    if (!localTableContent) {
      console.error('local-table-content element not found');
      return;
    }

    try {
      localTableContent.innerHTML = '<p class="text-blue-400 text-center py-4">Local kayıtlar yükleniyor...</p>';
      
      const stagedRecords = await window.api.stagingList('uretim');
      console.log('Staged records:', stagedRecords); // Debug
      
      const staged = stagedRecords || [];

      if (staged.length === 0) {
        localTableContent.innerHTML = '<p class="text-neutral-400 text-center py-4">📝 Henüz local kayıt yok</p>';
        return;
      }

      console.log(`Rendering ${staged.length} local records`); // Debug

      const tableHtml = `
        <div class="overflow-auto">
          <div class="mb-3 text-center">
            <span class="px-3 py-1 bg-yellow-600 text-yellow-100 rounded font-semibold">
              📊 ${staged.length} Local Kayıt Bulundu
            </span>
          </div>
          <table class="w-full text-left text-sm border border-yellow-600 rounded">
            <thead class="bg-yellow-600 text-black">
              <tr>
                <th class="p-3 font-bold">İşlem</th>
                <th class="p-3 font-bold">Tarih</th>
                <th class="p-3 font-bold">Vardiya</th>
                <th class="p-3 font-bold">Operator</th>
                <th class="p-3 font-bold">Ürün Kodu</th>
                <th class="p-3 font-bold">Op. Kodu</th>
                <th class="p-3 font-bold">Üretim Adedi</th>
                <th class="p-3 font-bold">Ekleme Zamanı</th>
              </tr>
            </thead>
            <tbody class="bg-yellow-900/20">
              ${staged.map((record, index) => {
                console.log(`Rendering record ${index}:`, record); // Debug
                
                return `
                <tr class="border-b border-yellow-700 hover:bg-yellow-900/40">
                  <td class="p-3">
                    <button data-staged-id="${record._stagedId || ''}" class="delete-local-btn px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold">
                      🗑️ SİL
                    </button>
                  </td>
                  <td class="p-3 font-semibold text-yellow-100">${record.tarih || '-'}</td>
                  <td class="p-3 text-yellow-200">${record.vardiya || '-'}</td>
                  <td class="p-3 font-bold text-white">${record.operator || '-'}</td>
                  <td class="p-3 text-yellow-200">${record.urunKodu || '-'}</td>
                  <td class="p-3 font-mono text-yellow-100">${record.operasyonKodu || '-'}</td>
                  <td class="p-3 text-center font-bold text-green-300 text-lg">${record.uretimAdedi || 0}</td>
                  <td class="p-3 text-neutral-300 text-xs">${
                    record._stagedAt ? new Date(record._stagedAt).toLocaleString('tr-TR') : '-'
                  }</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      localTableContent.innerHTML = tableHtml;
      console.log('Table rendered successfully'); // Debug

      // Local delete butonlarını wire et
      localTableContent.querySelectorAll('.delete-local-btn').forEach((btn, index) => {
        console.log(`Wiring delete button ${index}`); // Debug
        
        btn.addEventListener('click', async (e) => {
          const stagedId = btn.getAttribute('data-staged-id');
          console.log('Delete clicked for staged ID:', stagedId); // Debug
          
          if (!stagedId) return;
          
          if (!confirm('Bu local kaydı silmek istediğinizden emin misiniz?')) return;
          
          btn.disabled = true;
          btn.textContent = 'Siliniyor...';
          
          try {
            const result = await window.api.stagingDelete('uretim', stagedId);
            console.log('Delete result:', result); // Debug
            
            if (result && result.ok && result.removed > 0) {
              showToast('Local kayıt silindi', 'success');
              await renderLocalRecords(); // Local tabloyu yenile
              await loadList(); // Ana tabloyu da yenile
            } else {
              showToast('Local kayıt silinemedi', 'error');
              btn.disabled = false;
              btn.innerHTML = '🗑️ SİL';
            }
          } catch (err) {
            console.error('Delete error:', err);
            showToast('Silme hatası: ' + err.message, 'error');
            btn.disabled = false;
            btn.innerHTML = '🗑️ SİL';
          }
        });
      });

    } catch (err) {
      console.error('Local records render error:', err);
      localTableContent.innerHTML = `
        <div class="text-red-400 text-center py-4 border border-red-500 rounded bg-red-900/20">
          <p class="font-bold">❌ Local kayıtlar yüklenirken hata oluştu</p>
          <p class="text-sm mt-2">${err.message}</p>
        </div>
      `;
    }
  }

  async function loadList() {
    // Load both staged (local CSV) and saved (API) records
    const [stagedRecords, savedRecords] = await Promise.all([
      window.api.stagingList('uretim'),
      window.electronAPI.listUretim()
    ]);
    
    const staged = stagedRecords || [];
    const saved = savedRecords && savedRecords.ok ? (savedRecords.records || []) : [];
    
    if (!savedRecords || !savedRecords.ok) { 
      console.error('Saved records load failed:', savedRecords?.error);
    }

    // create selector + search
    const { wrapper: selectorWrap, select } = createRowCountSelector(20);
    const searchWrap = document.createElement('div');
    searchWrap.className = 'ml-2';
    searchWrap.innerHTML = `<input type="search" placeholder="Tabloda ara..." class="px-3 py-2 rounded bg-neutral-800 text-neutral-200" />`;
    const searchInput = searchWrap.querySelector('input');

    listPlaceholder.innerHTML = '';
    const topRow = document.createElement('div'); 
    topRow.className = 'flex items-center gap-2'; 
    topRow.appendChild(selectorWrap); 
    topRow.appendChild(searchWrap);
    listPlaceholder.appendChild(topRow);

    // Combined records for display (staged first, then saved)
    const allRecords = [...staged, ...saved];
    
    // pagination
    let pageSize = (select.value === 'all') ? allRecords.length || 1 : Number(select.value || 20);
    let currentPage = 1;
    const pager = createPaginationControls(allRecords.length, pageSize, currentPage, (p) => { currentPage = p; renderTable(); });
    listPlaceholder.appendChild(pager);
    const debugInfo = document.createElement('div'); 
    debugInfo.className = 'text-sm text-neutral-400 mt-1'; 
    listPlaceholder.appendChild(debugInfo);

    const renderTable = () => {
      // apply search filtering
      const q = (searchInput && searchInput.value || '').trim().toLowerCase();
      const filtered = q ? allRecords.filter(r => {
        return ['tarih','vardiya','ustabasi','bolum','operator','urunKodu','operasyonKodu'].some(k => String(r[k] || '').toLowerCase().includes(q));
      }) : allRecords;
      
      const limit = select.value;
      pageSize = (limit === 'all') ? allRecords.length || 1 : Number(limit || 20);
      
      // ensure pager knows totals (in case pageSize changed or currentPage changed)
      try { pager.update(allRecords.length, pageSize, currentPage); } catch (e) {}
      
      // compute slice for current page
      const start = (currentPage - 1) * pageSize;
      const slice = (limit === 'all') ? filtered : filtered.slice(start, start + pageSize);
      
      const html = `
      <div class="mt-6">
        <h3 class="text-xl font-semibold mb-2">Üretim Kayıtları 
          <span class="text-sm text-blue-400">(Local: ${staged.length}, DB: ${saved.length})</span>
        </h3>
        <div class="overflow-auto bg-neutral-800 p-2 rounded">
          <table class="w-full text-left text-sm">
            <thead class="text-neutral-400">
              <tr>
                <th class="p-2">Durum</th>
                <th class="p-2">İşlem</th>
                <th class="p-2">Tarih</th>
                <th class="p-2">Vardiya</th>
                <th class="p-2">Üstabaşı</th>
                <th class="p-2">Bölüm</th>
                <th class="p-2">Operator</th>
                <th class="p-2">Ürün Kodu</th>
                <th class="p-2">Op. Kodu</th>
                <th class="p-2">Op. Türü</th>
                <th class="p-2">Üretim Adedi</th>
                <th class="p-2">Başlangıç</th>
                <th class="p-2">Bitiş</th>
                <th class="p-2">Döküm Hatası</th>
                <th class="p-2">Operatör Hatası</th>
                <th class="p-2">Tezgah Arızası</th>
                <th class="p-2">Tezgah Ayarı</th>
                <th class="p-2">Elmas Değişimi</th>
                <th class="p-2">Parça Bekleme</th>
                <th class="p-2">Temizlik</th>
                <th class="p-2">Mola</th>
                <th class="p-2">Zaman</th>
              </tr>
            </thead>
            <tbody>
              ${slice.map(r => {
                const isStaged = r._stagedId !== undefined;
                const statusBadge = isStaged 
                  ? '<span class="px-2 py-1 text-xs bg-yellow-600 text-yellow-100 rounded">LOCAL</span>'
                  : '<span class="px-2 py-1 text-xs bg-green-600 text-green-100 rounded">DB</span>';
                
                const deleteButton = isStaged 
                  ? `<button data-staged-id="${r._stagedId || ''}" class="delete-staged-btn px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-xs">Sil</button>`
                  : `<button data-savedat="${r.savedAt || ''}" class="delete-btn px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-xs">Sil</button>`;
                
                // Find operation name for display - prefer saved name, fallback to lookup
                let operationName = '';
                if (r.operasyonAdi) {
                  operationName = r.operasyonAdi;
                } else if (r.operasyonKodu) {
                  const operation = operationsData.find(op => op.operationCode === r.operasyonKodu);
                  operationName = operation ? operation.operationName : '';
                }
                
                return `
                <tr class="border-t border-neutral-700 ${isStaged ? 'bg-yellow-900/20' : ''}">
                  <td class="p-2">${statusBadge}</td>
                  <td class="p-2">${deleteButton}</td>
                  <td class="p-2">${r.tarih || ''}</td>
                  <td class="p-2">${r.vardiya || ''}</td>
                  <td class="p-2">${r.ustabasi || ''}</td>
                  <td class="p-2">${r.bolum || ''}</td>
                  <td class="p-2">${r.operator || ''}</td>
                  <td class="p-2">${r.urunKodu || ''}</td>
                  <td class="p-2">${r.operasyonKodu || ''}</td>
                  <td class="p-2">${operationName}</td>
                  <td class="p-2">${r.uretimAdedi || ''}</td>
                  <td class="p-2">${r.baslangic || ''}</td>
                  <td class="p-2">${r.bitis || ''}</td>
                  <td class="p-2">${r.dokumHatasi || ''}</td>
                  <td class="p-2">${r.operatorHatasi || ''}</td>
                  <td class="p-2">${r.tezgahArizasi || ''}</td>
                  <td class="p-2">${r.tezgahAyari || ''}</td>
                  <td class="p-2">${r.elmasDegisimi || ''}</td>
                  <td class="p-2">${r.parcaBekleme || ''}</td>
                  <td class="p-2">${r.temizlik || ''}</td>
                  <td class="p-2">${r.mola || ''}</td>
                  <td class="p-2 text-neutral-400">${
                    isStaged 
                      ? (r._stagedAt ? new Date(r._stagedAt).toLocaleString() : '') 
                      : (r.savedAt ? new Date(r.savedAt).toLocaleString() : '')
                  }</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    // replace or append table after selector
    const existingTable = listPlaceholder.querySelector('.mt-6');
    if (existingTable) existingTable.outerHTML = html; 
    else listPlaceholder.insertAdjacentHTML('beforeend', html);
    
    // wire delete buttons for saved records
    listPlaceholder.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const savedAt = btn.getAttribute('data-savedat');
        if (!savedAt) return;
        btn.disabled = true;
        const res = await window.electronAPI.deleteUretim(savedAt);
        if (res && res.ok && res.removed) {
          showToast('Kayıt silindi', 'success');
          await loadList();
        } else {
          showToast('Silme başarısız', 'error');
          btn.disabled = false;
        }
      });
    });
    
    // wire delete buttons for staged records
    listPlaceholder.querySelectorAll('.delete-staged-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const stagedId = btn.getAttribute('data-staged-id');
        if (!stagedId) return;
        
        if (!confirm('Local kaydı silmek istediğinizden emin misiniz?')) return;
        
        btn.disabled = true;
        try {
          // Remove from staging CSV using the new staging-delete API
          const result = await window.api.stagingDelete('uretim', stagedId);
          if (result && result.ok && result.removed > 0) {
            showToast('Local kayıt silindi', 'success');
            await loadList();
          } else {
            showToast('Local kayıt silinemedi', 'error');
            btn.disabled = false;
          }
        } catch (err) {
          showToast('Local kayıt silinemedi: ' + err.message, 'error');
          btn.disabled = false;
        }
      });
    });
    
    try { pager.update(filtered.length, pageSize, currentPage); } catch(e) {}
    try { debugInfo.textContent = `Toplam: ${filtered.length} (Local: ${staged.length}, DB: ${saved.length}), SayfaBoyutu: ${pageSize}, Sayfa: ${currentPage}`; } catch(e) {}
    };

    // initial render
    pager.update(allRecords.length, pageSize, currentPage);
    renderTable();
    select.addEventListener('change', () => { 
      currentPage = 1; 
      pager.update(allRecords.length, (select.value==='all'?allRecords.length:Number(select.value)), currentPage); 
      renderTable(); 
    });
    // search handler
    if (searchInput) searchInput.addEventListener('input', () => { 
      currentPage = 1; 
      pager.update(allRecords.length, (select.value==='all'?allRecords.length:Number(select.value)), currentPage); 
      renderTable(); 
    });
  }

  await loadList();
  await renderLocalRecords(); // İlk yüklemede local kayıtları göster

  // set cleanup so unmount can remove listeners
  _cleanup = () => {
    try { form.removeEventListener('submit', submitHandler); } catch(e){}
    try { const resetBtn = container.querySelector('#uretim-reset'); if (resetBtn) resetBtn.removeEventListener('click', resetHandler); } catch(e){}
    // clear DOM
    try { container.innerHTML = ''; } catch(e){}
    _cleanup = null;
  };
}

export async function unmount(container) {
  if (_cleanup) _cleanup();
}
