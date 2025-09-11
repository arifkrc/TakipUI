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
    },
    onUploadAll: async () => {
      return await window.api.stagingUpload('uretim');
    },
    onClearAll: async () => {
      await window.api.stagingClear('uretim');
    },
    refreshCallback: async () => {
      await loadList();
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
      
      const select = container.querySelector('#operasyon-select');
      if (select) {
        // Clear existing options
        select.innerHTML = '<option value="">Seçiniz...</option>';
        
        // Add all operation options for display
        operationsData.forEach(op => {
          const option = document.createElement('option');
          option.value = op.operationCode;
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
    
    // Real-time matching as user types
    codeInput.addEventListener('input', function(e) {
      let code = e.target.value.trim();
      
      // Limit to 2 characters and only allow numbers
      if (code.length > 2) {
        code = code.substring(0, 2);
        e.target.value = code;
      }
      
      // Find matching operation
      const matchedOp = operationsData.find(op => 
        op.operationCode && op.operationCode === code
      );
      
      if (matchedOp && code.length > 0) {
        // Set select value and show matched operation
        select.value = matchedOp.operationCode;
        select.style.color = '#e5e7eb'; // text-neutral-200
        
        // Update the display text
        const matchingOption = select.querySelector(`option[value="${matchedOp.operationCode}"]`);
        if (matchingOption) {
          matchingOption.selected = true;
        }
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
        } else {
          showToast('Operasyon kodu bulunamadı', 'error');
        }
      }
    });
    
    // Only allow numeric characters
    codeInput.addEventListener('keypress', function(e) {
      const char = e.key;
      if (!/[0-9]/.test(char) && char !== 'Backspace' && char !== 'Delete') {
        e.preventDefault();
      }
    });
    
    // Handle combobox selection - update code input when user selects from dropdown
    select.addEventListener('change', function(e) {
      const selectedCode = e.target.value;
      if (selectedCode && selectedCode !== '') {
        codeInput.value = selectedCode;
        const matchedOp = operationsData.find(op => op.operationCode === selectedCode);
        if (matchedOp) {
          showToast(`✓ ${matchedOp.operationName}`, 'success');
        }
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

      const res = await window.electronAPI.saveUretim(data);
      if (res && res.ok) {
        showToast('Kayıt başarıyla kaydedildi', 'success');
        form.reset();
        // restore
        form.querySelector('[name="tarih"]').value = keepDate;
        form.querySelector('[name="vardiya"]').value = keepVardiya;
        form.querySelector('[name="ustabasi"]').value = keepUstabasi;
        loadList();
      } else {
        showToast('Kaydetme başarısız: ' + (res && res.error ? res.error : 'bilinmeyen hata'), 'error');
      }
    } catch (err) {
      showToast('Kaydetme hatası: ' + String(err), 'error');
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = 'Kaydet';
    }
  }

  function resetHandler() { form.reset(); setDefaultDate(); }

  form.addEventListener('submit', submitHandler);
  container.querySelector('#uretim-reset').addEventListener('click', resetHandler);

  async function loadList() {
    const res = await window.electronAPI.listUretim();
    if (!res || !res.ok) { listPlaceholder.innerHTML = '<div class="text-rose-400">Liste yüklenemedi</div>'; return; }
    const records = res.records || [];

  // create selector + search
  const { wrapper: selectorWrap, select } = createRowCountSelector(20);
  const searchWrap = document.createElement('div');
  searchWrap.className = 'ml-2';
  searchWrap.innerHTML = `<input type="search" placeholder="Tabloda ara..." class="px-3 py-2 rounded bg-neutral-800 text-neutral-200" />`;
  const searchInput = searchWrap.querySelector('input');

  listPlaceholder.innerHTML = '';
  const topRow = document.createElement('div'); topRow.className = 'flex items-center gap-2'; topRow.appendChild(selectorWrap); topRow.appendChild(searchWrap);
  listPlaceholder.appendChild(topRow);

    // pagination
    let pageSize = (select.value === 'all') ? records.length || 1 : Number(select.value || 20);
    let currentPage = 1;
    const pager = createPaginationControls(records.length, pageSize, currentPage, (p) => { currentPage = p; renderTable(); });
  listPlaceholder.appendChild(pager);
  const debugInfo = document.createElement('div'); debugInfo.className = 'text-sm text-neutral-400 mt-1'; listPlaceholder.appendChild(debugInfo);

    const renderTable = () => {
      // apply search filtering
      const q = (searchInput && searchInput.value || '').trim().toLowerCase();
      const filtered = q ? records.filter(r => {
        return ['tarih','vardiya','ustabasi','bolum','operator','urunKodu','operasyonKodu'].some(k => String(r[k] || '').toLowerCase().includes(q));
      }) : records;
      const limit = select.value;
      pageSize = (limit === 'all') ? records.length || 1 : Number(limit || 20);
      // ensure pager knows totals (in case pageSize changed or currentPage changed)
      try { pager.update(records.length, pageSize, currentPage); } catch (e) {}
      // compute slice for current page
      const start = (currentPage - 1) * pageSize;
  const slice = (limit === 'all') ? filtered : filtered.slice(start, start + pageSize);
      const html = `
      <div class="mt-6">
        <h3 class="text-xl font-semibold mb-2">Kay\u0131tl\u0131 \u00dcretimler</h3>
        <div class="overflow-auto bg-neutral-800 p-2 rounded">
          <table class="w-full text-left text-sm">
            <thead class="text-neutral-400">
              <tr>
                <th class="p-2"> </th>
                <th class="p-2">Tarih</th>
                <th class="p-2">Vardiya</th>
                <th class="p-2">\u00dcstaba\u015f\u0131</th>
                <th class="p-2">B\u00f6l\u00fcm</th>
                <th class="p-2">Operator</th>
                <th class="p-2">\u00dcr\u00fcn Kodu</th>
                <th class="p-2">\u00dcretim Adedi</th>
                <th class="p-2">Op. Kodu</th>
                <th class="p-2">Ba\u015flang\u0131\u00e7</th>
                <th class="p-2">Biti\u015f</th>
                <th class="p-2">D\u00f6k\u00fcm</th>
                <th class="p-2">Operat\u00f6r Hata</th>
                <th class="p-2">Tezgah Ar\u0131za</th>
                <th class="p-2">Tezgah Ayar</th>
                <th class="p-2">Elmas</th>
                <th class="p-2">Par\u00e7a Bekleme</th>
                <th class="p-2">Temizlik</th>
                <th class="p-2">Mola</th>
                <th class="p-2">Kaydedildi</th>
              </tr>
            </thead>
            <tbody>
              ${slice.map(r => `
                <tr class="border-t border-neutral-700">
                  <td class="p-2"><button data-savedat="${r.savedAt || ''}" class="delete-btn px-2 py-1 rounded bg-rose-600 hover:bg-rose-500">✖</button></td>
                  <td class="p-2">${r.tarih || ''}</td>
                  <td class="p-2">${r.vardiya || ''}</td>
                  <td class="p-2">${r.ustabasi || ''}</td>
                  <td class="p-2">${r.bolum || ''}</td>
                  <td class="p-2">${r.operator || ''}</td>
                  <td class="p-2">${r.urunKodu || ''}</td>
                  <td class="p-2">${r.uretimAdedi || ''}</td>
                  <td class="p-2">${r.operasyonKodu || ''}</td>
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
                  <td class="p-2 text-neutral-400">${r.savedAt ? new Date(r.savedAt).toLocaleString() : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  // replace or append table after selector
  const existingTable = listPlaceholder.querySelector('.mt-6');
  if (existingTable) existingTable.outerHTML = html; else listPlaceholder.insertAdjacentHTML('beforeend', html);
  // wire delete buttons
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
  try { pager.update(filtered.length, pageSize, currentPage); } catch(e) {}
  try { debugInfo.textContent = `Toplam: ${filtered.length}, SayfaBoyutu: ${pageSize}, Sayfa: ${currentPage}`; } catch(e) {}
    };

  // initial render
  pager.update(records.length, pageSize, currentPage);
  renderTable();
  select.addEventListener('change', () => { currentPage = 1; pager.update(records.length, (select.value==='all'?records.length:Number(select.value)), currentPage); renderTable(); });
  // search handler
  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; pager.update(records.length, (select.value==='all'?records.length:Number(select.value)), currentPage); renderTable(); });
  }

  await loadList();

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
