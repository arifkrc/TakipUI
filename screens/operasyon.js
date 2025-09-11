import { createRowCountSelector, createPaginationControls, createStagingControls, showToast, showFormErrors, clearFormErrors } from '../ui/helpers.js';
let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Operasyonlar', 'Operasyon tanımları');

  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Operasyon Ekle</h3>
      <form id="operasyon-form" class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Operasyon Kodu<input name="operasyonKodu" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
          <label class="flex flex-col text-sm">Operasyon Adı<input name="operasyonAdi" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
          <label class="flex items-center gap-3 text-sm">Aktif<label class="switch"><input name="aktif" type="checkbox" checked class="mt-1"/></label></label>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Kaydet</button>
          <button type="button" id="operasyon-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="staging-controls-placeholder"></div>
      <div id="operasyon-list-placeholder"></div>
    </div>
  `;

  const form = container.querySelector('#operasyon-form');
  const stagingPlaceholder = container.querySelector('#staging-controls-placeholder');
  const placeholder = container.querySelector('#operasyon-list-placeholder');

  // Create staging controls
  const stagingControls = createStagingControls('operasyon', {
    onAddLocal: async () => {
      clearFormErrors(form);
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      data.aktif = !!form.querySelector('[name="aktif"]').checked;

      const errors = [];
      if (!data.operasyonKodu) errors.push({ field: 'operasyonKodu', msg: 'Operasyon kodu gerekli' });
      if (!data.operasyonAdi) errors.push({ field: 'operasyonAdi', msg: 'Operasyon adı gerekli' });
      if (errors.length) { 
        showFormErrors(form, errors); 
        throw new Error('Form validation failed');
      }

      await window.api.stagingAdd('operasyon', data);
      showToast('Operasyon local\'e eklendi', 'success');
      form.reset();
      form.querySelector('[name="aktif"]').checked = true;
    },
    onUploadAll: async () => {
      return await window.api.stagingUpload('operasyon');
    },
    onClearAll: async () => {
      await window.api.stagingClear('operasyon');
    },
    refreshCallback: async () => {
      await loadList();
    }
  });
  
  stagingPlaceholder.appendChild(stagingControls);

  async function submitHandler(e) {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    data.aktif = !!form.querySelector('[name="aktif"]').checked;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Kaydediliyor...';
    try {
      const res = await window.electronAPI.saveOperasyon(data);
      if (res && res.ok) {
        form.reset();
        await loadList();
      } else {
        console.error('saveOperasyon failed', res);
      }
    } catch (err) {
      console.error(err);
    } finally { submitBtn.disabled = false; submitBtn.textContent = 'Kaydet'; }
  }

  function resetHandler() { form.reset(); }

  form.addEventListener('submit', submitHandler);
  form.querySelector('#operasyon-reset').addEventListener('click', resetHandler);

  async function loadList() {
    const res = await window.electronAPI.listOperasyon();
    if (!res || !res.ok) { placeholder.innerHTML = '<div class="text-rose-400">Liste yüklenemedi</div>'; return; }
    const records = res.records || [];

  const { wrapper: selectorWrap, select } = createRowCountSelector(20);
  const searchWrap = document.createElement('div');
  searchWrap.className = 'ml-2';
  searchWrap.innerHTML = `<input type="search" placeholder="Tabloda ara..." class="px-3 py-2 rounded bg-neutral-800 text-neutral-200" />`;
  const searchInput = searchWrap.querySelector('input');

  placeholder.innerHTML = '';
  const topRow = document.createElement('div'); topRow.className = 'flex items-center gap-2'; topRow.appendChild(selectorWrap); topRow.appendChild(searchWrap);
  placeholder.appendChild(topRow);

    let pageSize = (select.value === 'all') ? records.length || 1 : Number(select.value || 20);
    let currentPage = 1;
    const pager = createPaginationControls(records.length, pageSize, currentPage, (p) => { currentPage = p; renderTable(); });
  placeholder.appendChild(pager);
  const debugInfo = document.createElement('div'); debugInfo.className = 'text-sm text-neutral-400 mt-1'; placeholder.appendChild(debugInfo);

    const renderTable = () => {
      const limit = select.value;
    pageSize = (limit === 'all') ? records.length || 1 : Number(limit || 20);
  try { pager.update(records.length, pageSize, currentPage); } catch(e) {}
  try { debugInfo.textContent = `Toplam: ${records.length}, SayfaBoyutu: ${pageSize}, Sayfa: ${currentPage}`; } catch(e) {}
      const q = (searchInput && searchInput.value || '').trim().toLowerCase();
      const filtered = q ? records.filter(r => {
        return ['operasyonKodu','operasyonAdi'].some(k => String(r[k] || '').toLowerCase().includes(q));
      }) : records;
      const start = (currentPage - 1) * pageSize;
      const slice = (limit === 'all') ? filtered : filtered.slice(start, start + pageSize);
      const html = `
      <div class="mt-4">
        <h4 class="text-lg font-medium mb-2">Tanımlı Operasyonlar</h4>
        <div class="overflow-auto bg-neutral-800 p-2 rounded">
          <table class="w-full text-left text-sm">
            <thead class="text-neutral-400">
              <tr>
                <th class="p-2"> </th>
                <th class="p-2">Operasyon Kodu</th>
                <th class="p-2">Operasyon Adı</th>
                <th class="p-2">Aktif</th>
                <th class="p-2">Kaydedildi</th>
              </tr>
            </thead>
            <tbody>
              ${slice.map(r => `
                <tr class="border-t border-neutral-700">
                  <td class="p-2"><button data-savedat="${r.savedAt || ''}" class="delete-btn px-2 py-1 rounded bg-rose-600 hover:bg-rose-500">✖</button></td>
                  <td class="p-2">${r.operasyonKodu || ''}</td>
                  <td class="p-2">${r.operasyonAdi || ''}</td>
                  <td class="p-2">${r.aktif ? 'Evet' : 'Hayır'}</td>
                  <td class="p-2 text-neutral-400">${r.savedAt ? new Date(r.savedAt).toLocaleString() : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  const existingTable = placeholder.querySelector('.mt-4');
  if (existingTable) existingTable.outerHTML = html; else placeholder.insertAdjacentHTML('beforeend', html);
  try { pager.update(records.length, pageSize, currentPage); } catch(e) {}
  placeholder.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const savedAt = btn.getAttribute('data-savedat'); if (!savedAt) return; btn.disabled = true;
      const res = await window.electronAPI.deleteOperasyon(savedAt);
      if (res && res.ok && res.removed) { await loadList(); } else { btn.disabled = false; }
    });
  });
    };

  pager.update(records.length, pageSize, currentPage);
  renderTable();
  select.addEventListener('change', () => { currentPage = 1; pager.update(records.length, (select.value==='all'?records.length:Number(select.value)), currentPage); renderTable(); });
  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; pager.update(records.length, (select.value==='all'?records.length:Number(select.value)), currentPage); renderTable(); });
  }

  await loadList();

  _cleanup = () => {
    try { form.removeEventListener('submit', submitHandler); } catch(e){}
    try { const resetBtn = form.querySelector('#operasyon-reset'); if (resetBtn) resetBtn.removeEventListener('click', resetHandler); } catch(e){}
    try { container.innerHTML = ''; } catch(e){}
    _cleanup = null;
  };
}

export async function unmount(container) { if (_cleanup) _cleanup(); }
