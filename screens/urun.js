import { createRowCountSelector, createPaginationControls } from '../ui/helpers.js';
let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Ürünler', 'Ürün tanımları');

  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Ürün Ekle</h3>
      <form id="urun-form" class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Ürün Kodu<input name="urunKodu" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
          <label class="flex flex-col text-sm">Ürün Tipi<select name="urunTipi" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100"><option value="standart">Standart</option><option value="ozel">Özel</option><option value="numune">Numune</option></select></label>
          <label class="flex items-center gap-3 text-sm">Aktif<label class="switch"><input name="aktif" type="checkbox" checked class="mt-1"/></label></label>
        </div>

        <div>
          <label class="flex flex-col text-sm">Ürün Açıklaması<textarea name="urunAciklamasi" rows="3" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100"></textarea></label>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Kaydet</button>
          <button type="button" id="urun-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="urun-list-placeholder"></div>
    </div>
  `;

  const form = container.querySelector('#urun-form');
  const placeholder = container.querySelector('#urun-list-placeholder');

  async function submitHandler(e) {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    // checkbox handling
    data.aktif = !!form.querySelector('[name="aktif"]').checked;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Kaydediliyor...';
    try {
      const res = await window.electronAPI.saveUrun(data);
      if (res && res.ok) {
        // reset except keep urunTipi maybe
        form.reset();
        form.querySelector('[name="urunTipi"]').value = data.urunTipi || 'standart';
        await loadList();
      } else {
        console.error('saveUrun failed', res);
      }
    } catch (err) {
      console.error(err);
    } finally { submitBtn.disabled = false; submitBtn.textContent = 'Kaydet'; }
  }

  function resetHandler() { form.reset(); }

  form.addEventListener('submit', submitHandler);
  form.querySelector('#urun-reset').addEventListener('click', resetHandler);

  async function loadList() {
    const res = await window.electronAPI.listUrun();
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
      const start = (currentPage - 1) * pageSize;
      const q = (searchInput && searchInput.value || '').trim().toLowerCase();
      const filtered = q ? records.filter(r => {
        return ['urunKodu','urunAciklamasi','urunTipi'].some(k => String(r[k] || '').toLowerCase().includes(q));
      }) : records;
      const slice = (limit === 'all') ? filtered : filtered.slice(start, start + pageSize);
      const html = `
      <div class="mt-4">
        <h4 class="text-lg font-medium mb-2">Tanımlı Ürünler</h4>
        <div class="overflow-auto bg-neutral-800 p-2 rounded">
          <table class="w-full text-left text-sm">
            <thead class="text-neutral-400">
              <tr>
                <th class="p-2"> </th>
                <th class="p-2">Ürün Kodu</th>
                <th class="p-2">Açıklama</th>
                <th class="p-2">Tipi</th>
                <th class="p-2">Aktif</th>
                <th class="p-2">Kaydedildi</th>
              </tr>
            </thead>
            <tbody>
              ${slice.map(r => `
                <tr class="border-t border-neutral-700">
                  <td class="p-2"><button data-savedat="${r.savedAt || ''}" class="delete-btn px-2 py-1 rounded bg-rose-600 hover:bg-rose-500">✖</button></td>
                  <td class="p-2">${r.urunKodu || ''}</td>
                  <td class="p-2">${r.urunAciklamasi || ''}</td>
                  <td class="p-2">${r.urunTipi || ''}</td>
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
      const res = await window.electronAPI.deleteUrun(savedAt);
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
    try { const resetBtn = form.querySelector('#urun-reset'); if (resetBtn) resetBtn.removeEventListener('click', resetHandler); } catch(e){}
    try { container.innerHTML = ''; } catch(e){}
    _cleanup = null;
  };
}

export async function unmount(container) { if (_cleanup) _cleanup(); }
