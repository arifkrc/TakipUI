import { showToast, showFormErrors, clearFormErrors, createRowCountSelector, createPaginationControls } from '../ui/helpers.js';

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

        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Üretim Adedi<input name="uretimAdedi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">İş Başlangıç Saati<input name="baslangic" type="time" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">İş Bitiş Saati<input name="bitis" type="time" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
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

      <div id="uretim-list-placeholder"></div>
    </div>
  `;

  const form = container.querySelector('#uretim-form');
  const listPlaceholder = container.querySelector('#uretim-list-placeholder');

  function setDefaultDate() {
    const dateInput = form.querySelector('[name="tarih"]');
    if (dateInput && !dateInput.value) {
      const today = new Date();
      dateInput.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    }
  }

  setDefaultDate();

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
        return ['tarih','vardiya','ustabasi','bolum','operator','urunKodu'].some(k => String(r[k] || '').toLowerCase().includes(q));
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
