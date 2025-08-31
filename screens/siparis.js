import { createRowCountSelector, createPaginationControls } from '../ui/helpers.js';
let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Siparişler', 'Sipariş import ve listesi');

  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Siparişler</h3>

      <div class="mb-4 flex items-center gap-3">
        <button id="import-files" class="px-4 py-2 rounded bg-green-600 hover:bg-green-500">Dosya İçe Aktar (CSV/XLSX)</button>
      </div>

      <div id="siparis-import-preview" class="mb-4"></div>

      <form id="siparis-form" class="space-y-4 mb-4">
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Ürün Kodu<input name="urunKodu" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Açıklama<input name="aciklama" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Seçenekler<input name="secenekler" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Belge No<input name="belgeNo" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Müşteri Adı<input name="musteriAdi" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Sipariş Adet<input name="siparisAdet" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Devir Sayısı<input name="devirSayisi" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <div></div>
          <div></div>
        </div>
        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Ekle</button>
          <button type="button" id="siparis-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="siparis-list-placeholder"></div>
    </div>
  `;

  const importBtn = container.querySelector('#import-files');
  const importPreview = container.querySelector('#siparis-import-preview');
  const form = container.querySelector('#siparis-form');
  const resetBtn = container.querySelector('#siparis-reset');
  const listPlaceholder = container.querySelector('#siparis-list-placeholder');

  let lastPreview = { rows: [], filePaths: [] };

  function renderPreview(rows) {
    if (!rows || rows.length === 0) {
      importPreview.innerHTML = '<div class="text-neutral-400">Önizlenecek veri yok</div>';
      return;
    }

  // create selector + search for preview
  const { wrapper: selectorWrap, select } = createRowCountSelector(20);
  const searchWrap = document.createElement('div');
  searchWrap.className = 'ml-2';
  searchWrap.innerHTML = `<input type="search" placeholder="Önizlemede ara..." class="px-3 py-2 rounded bg-neutral-800 text-neutral-200" />`;
  const searchInput = searchWrap.querySelector('input');

  importPreview.innerHTML = '';
  const topRow = document.createElement('div'); topRow.className = 'flex items-center gap-2'; topRow.appendChild(selectorWrap); topRow.appendChild(searchWrap);
  importPreview.appendChild(topRow);

  let previewPageSize = (select.value === 'all') ? rows.length || 1 : Number(select.value || 20);
  let previewPage = 1;
  const previewPager = createPaginationControls(rows.length, previewPageSize, previewPage, (p) => { previewPage = p; renderTable(); });
  importPreview.appendChild(previewPager);
  const previewDebug = document.createElement('div'); previewDebug.className = 'text-sm text-neutral-400 mt-1'; importPreview.appendChild(previewDebug);

  const renderTable = () => {
  const q = (searchInput && searchInput.value || '').trim().toLowerCase();
  const filtered = q ? rows.filter(r => {
    return ['urunKodu','aciklama','secenekler','belgeNo','musteriAdi'].some(k => String(r[k] || '').toLowerCase().includes(q));
  }) : rows;
  const limit = select.value;
  const pageSizeLocal = (limit === 'all') ? filtered.length || 1 : Number(limit || 20);
  const start = (previewPage - 1) * pageSizeLocal;
  const slice = (limit === 'all') ? filtered : filtered.slice(start, start + pageSizeLocal);
  try { previewPager.update(filtered.length, pageSizeLocal, previewPage); } catch(e) {}
  try { previewDebug.textContent = `Toplam Önizleme: ${filtered.length}, SayfaBoyutu: ${select.value}, Sayfa: ${previewPage}`; } catch(e) {}
  const html = `
      <div class="mb-2">
        <h4 class="text-lg font-medium">İçe Aktarılacak Satırlar</h4>
        <div class="overflow-auto bg-neutral-800 p-2 rounded">
          <table class="w-full text-left text-sm">
            <thead class="text-neutral-400"><tr>
              <th class="p-2">Ürün Kodu</th>
              <th class="p-2">Açıklama</th>
              <th class="p-2">Seçenekler</th>
              <th class="p-2">Belge no</th>
              <th class="p-2">Müşteri</th>
              <th class="p-2">Sipariş Adet</th>
            </tr></thead>
            <tbody>
              ${slice.map(r => `
                <tr class="border-t border-neutral-700">
                  <td class="p-2">${r.urunKodu || ''}</td>
                  <td class="p-2">${r.aciklama || ''}</td>
                  <td class="p-2">${r.secenekler || ''}</td>
                  <td class="p-2">${r.belgeNo || ''}</td>
                  <td class="p-2">${r.musteriAdi || ''}</td>
                  <td class="p-2">${r.siparisAdet || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="mt-2 flex gap-2">
          <button id="import-confirm" class="px-3 py-2 bg-green-600 rounded">Tümünü İçe Aktar</button>
          <button id="import-cancel" class="px-3 py-2 bg-neutral-700 rounded">İptal</button>
        </div>
      </div>
    `;
  const existingTable = importPreview.querySelector('.mb-2');
  if (existingTable) existingTable.outerHTML = html; else importPreview.insertAdjacentHTML('beforeend', html);
  try { previewPager.update(filtered.length, pageSizeLocal, previewPage); } catch(e) {}

  const conf = importPreview.querySelector('#import-confirm');
      const canc = importPreview.querySelector('#import-cancel');
      conf.addEventListener('click', async () => {
        conf.disabled = true; conf.textContent = 'İçe Aktarılıyor...';
        try {
          const res = await window.electronAPI.importSiparis(lastPreview.filePaths);
          if (res && res.ok) {
            await loadList();
            importPreview.innerHTML = '<div class="text-green-400">İçe aktarma tamamlandı</div>';
            lastPreview = { rows: [], filePaths: [] };
          } else {
            console.error('import failed', res);
          }
        } catch (err) { console.error(err); }
        finally { conf.disabled = false; conf.textContent = 'Tümünü İçe Aktar'; }
      });
  canc.addEventListener('click', () => { importPreview.innerHTML = ''; lastPreview = { rows: [], filePaths: [] }; });
  if (searchInput) searchInput.addEventListener('input', () => { previewPage = 1; renderTable(); });
    };

  // initial render
  renderTable();
  select.addEventListener('change', () => { previewPage = 1; renderTable(); });
  }

  async function importHandler() {
    importBtn.disabled = true; importBtn.textContent = 'Önizleniyor...';
    try {
      const res = await window.electronAPI.previewSiparis();
      if (res && res.ok) {
        lastPreview = { rows: res.rows || [], filePaths: res.filePaths || [] };
        renderPreview(lastPreview.rows);
      } else { console.error('preview failed', res); }
    } catch (err) { console.error(err); }
    finally { importBtn.disabled = false; importBtn.textContent = 'Dosya İçe Aktar (CSV/XLSX)'; }
  }

  async function submitHandler(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.siparisAdet = Number(data.siparisAdet) || 0;
    data.devirSayisi = Number(data.devirSayisi) || 0;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Ekleniyor...';
    try {
      const res = await window.electronAPI.saveSiparis(data);
      if (res && res.ok) { form.reset(); await loadList(); }
      else console.error('save siparis failed', res);
    } catch (err) { console.error(err); }
    finally { submitBtn.disabled = false; submitBtn.textContent = 'Ekle'; }
  }

  function resetHandler() { form.reset(); }

  importBtn.addEventListener('click', importHandler);
  form.addEventListener('submit', submitHandler);
  resetBtn.addEventListener('click', resetHandler);

  async function loadList() {
    const res = await window.electronAPI.listSiparis();
    if (!res || !res.ok) { listPlaceholder.innerHTML = '<div class="text-rose-400">Liste yüklenemedi</div>'; return; }
    const records = res.records || [];

  const { wrapper: selectorWrap, select } = createRowCountSelector(20);
  const searchWrap = document.createElement('div');
  searchWrap.className = 'ml-2';
  searchWrap.innerHTML = `<input type="search" placeholder="Tabloda ara..." class="px-3 py-2 rounded bg-neutral-800 text-neutral-200" />`;
  const searchInput = searchWrap.querySelector('input');

  listPlaceholder.innerHTML = '';
  const topRow = document.createElement('div'); topRow.className = 'flex items-center gap-2'; topRow.appendChild(selectorWrap); topRow.appendChild(searchWrap);
  listPlaceholder.appendChild(topRow);

  let pageSize = (select.value === 'all') ? records.length || 1 : Number(select.value || 20);
  let currentPage = 1;
  const pager = createPaginationControls(records.length, pageSize, currentPage, (p) => { currentPage = p; renderTable(); });
  listPlaceholder.appendChild(pager);
  const listDebug = document.createElement('div'); listDebug.className = 'text-sm text-neutral-400 mt-1'; listPlaceholder.appendChild(listDebug);

    const renderTable = () => {
      const q = (searchInput && searchInput.value || '').trim().toLowerCase();
      const filtered = q ? records.filter(r => {
        return ['urunKodu','aciklama','secenekler','belgeNo','musteriAdi'].some(k => String(r[k] || '').toLowerCase().includes(q));
      }) : records;
      const limit = select.value;
      pageSize = (limit === 'all') ? filtered.length || 1 : Number(limit || 20);
  try { pager.update(filtered.length, pageSize, currentPage); } catch(e) {}
  try { listDebug.textContent = `Toplam: ${filtered.length}, SayfaBoyutu: ${pageSize}, Sayfa: ${currentPage}`; } catch(e) {}
      const start = (currentPage - 1) * pageSize;
      const slice = (limit === 'all') ? filtered : filtered.slice(start, start + pageSize);
      const html = `
      <div class="mt-4">
        <h4 class="text-lg font-medium mb-2">Siparişler</h4>
        <div class="overflow-auto bg-neutral-800 p-2 rounded">
          <table class="w-full text-left text-sm">
            <thead class="text-neutral-400">
              <tr>
                <th class="p-2"> </th>
                <th class="p-2">Ürün Kodu</th>
                <th class="p-2">Açıklama</th>
                <th class="p-2">Seçenekler</th>
                <th class="p-2">Belge No</th>
                <th class="p-2">Müşteri</th>
                <th class="p-2">Sipariş Adet</th>
                <th class="p-2">Devir Sayısı</th>
                <th class="p-2">Kaydedildi</th>
              </tr>
            </thead>
            <tbody>
              ${slice.map(r => `
                <tr class="border-t border-neutral-700">
                  <td class="p-2"><button data-savedat="${r.savedAt || ''}" class="delete-btn px-2 py-1 rounded bg-rose-600 hover:bg-rose-500">✖</button></td>
                  <td class="p-2">${r.urunKodu || ''}</td>
                  <td class="p-2">${r.aciklama || ''}</td>
                  <td class="p-2">${r.secenekler || ''}</td>
                  <td class="p-2">${r.belgeNo || ''}</td>
                  <td class="p-2">${r.musteriAdi || ''}</td>
                  <td class="p-2">${r.siparisAdet || ''}</td>
                  <td class="p-2">${r.devirSayisi || ''}</td>
                  <td class="p-2 text-neutral-400">${r.savedAt ? new Date(r.savedAt).toLocaleString() : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  const existingTable = listPlaceholder.querySelector('.mt-4');
  if (existingTable) existingTable.outerHTML = html; else listPlaceholder.insertAdjacentHTML('beforeend', html);
  try { pager.update(records.length, pageSize, currentPage); } catch(e) {}
  listPlaceholder.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const savedAt = btn.getAttribute('data-savedat'); if (!savedAt) return; btn.disabled = true;
      const res = await window.electronAPI.deleteSiparis(savedAt);
      if (res && res.ok && res.removed) { await loadList(); } else { btn.disabled = false; }
    });
  });
    };

  renderTable(select.value);
  select.addEventListener('change', () => { currentPage = 1; renderTable(select.value); });
  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; renderTable(select.value); });
  }

  await loadList();

  _cleanup = () => {
    try { importBtn.removeEventListener('click', importHandler); } catch(e){}
    try { form.removeEventListener('submit', submitHandler); } catch(e){}
    try { resetBtn.removeEventListener('click', resetHandler); } catch(e){}
    try { container.innerHTML = ''; } catch(e){}
    _cleanup = null;
  };
}

export async function unmount(container) { if (_cleanup) _cleanup(); }
