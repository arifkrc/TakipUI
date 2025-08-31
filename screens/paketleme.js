import { showToast, createRowCountSelector, createPaginationControls } from '../ui/helpers.js';

let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Paketleme', 'Paketleme kayıtları');
  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Paketleme Kayıt Formu</h3>
      <form id="paketleme-form" class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Tarih<input name="tarih" type="date" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
          <label class="flex flex-col text-sm">Vardiya<select name="vardiya" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100"><option>1 00-08</option><option>2 08-16</option><option>3 16-24</option></select></label>
          <label class="flex flex-col text-sm">Üstabaşı<input name="ustabasi" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Ürün Kodu<input name="urunKodu" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Açıklama<input name="aciklama" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Müşteri<input name="musteri" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Adet<input name="adet" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Fire<input name="fire" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Patlatılan Kutu Sayısı<input name="patlatilanKutu" type="number" min="0" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Patlatılan Firma<input name="patlatilanFirma" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <label class="flex flex-col text-sm">Hazırlanan Firma<input name="hazirlananFirma" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
          <div></div>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Kaydet</button>
          <button type="button" id="paketleme-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="paketleme-list-placeholder"></div>
    </div>
  `;

  const form = container.querySelector('#paketleme-form');
  const placeholder = container.querySelector('#paketleme-list-placeholder');

  function setDefaultDate() {
    const dateInput = form.querySelector('[name="tarih"]');
    if (dateInput && !dateInput.value) {
      const today = new Date();
      dateInput.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    }
  }
  setDefaultDate();

  async function submitHandler(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    ['adet','fire','patlatilanKutu'].forEach(k => { if (data[k] !== undefined) data[k] = Number(data[k]) || 0; });

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Kaydediliyor...';
    try {
      const res = await window.electronAPI.savePaketleme(data);
      if (res && res.ok) {
        showToast('Paketleme kaydı kaydedildi', 'success');
        form.reset(); setDefaultDate();
        await loadList();
      } else {
        showToast('Kaydetme başarısız: ' + (res && res.error ? res.error : 'bilinmeyen hata'), 'error');
      }
    } catch (err) {
      showToast('Kaydetme hatası: ' + String(err), 'error');
    } finally { submitBtn.disabled = false; submitBtn.textContent = 'Kaydet'; }
  }

  function resetHandler() { form.reset(); }

  form.addEventListener('submit', submitHandler);
  form.querySelector('#paketleme-reset').addEventListener('click', resetHandler);

  async function loadList() {
    const res = await window.electronAPI.listPaketleme();
    if (!res || !res.ok) { placeholder.innerHTML = '<div class="text-rose-400">Liste y\u00fcklenemedi</div>'; return; }
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
        return ['tarih','vardiya','ustabasi','urunKodu','aciklama','musteri'].some(k => String(r[k] || '').toLowerCase().includes(q));
      }) : records;
      const slice = (limit === 'all') ? filtered : filtered.slice(start, start + pageSize);
      const html = `
      <div class="mt-4">
        <h4 class="text-lg font-medium mb-2">Kay\u0131tl\u0131 Paketlemeler</h4>
        <div class="overflow-auto bg-neutral-800 p-2 rounded">
          <table class="w-full text-left text-sm">
            <thead class="text-neutral-400">
              <tr>
                <th class="p-2"> </th>
                <th class="p-2">Tarih</th>
                <th class="p-2">Vardiya</th>
                <th class="p-2">\u00dcstaba\u015f\u0131</th>
                <th class="p-2">\u00dcr\u00fcn Kodu</th>
                <th class="p-2">A\u00e7\u0131klama</th>
                <th class="p-2">M\u00fc\u015fteri</th>
                <th class="p-2">Adet</th>
                <th class="p-2">Fire</th>
                <th class="p-2">Patlat\u0131lan Kutu</th>
                <th class="p-2">Patlat\u0131lan Firma</th>
                <th class="p-2">Haz\u0131rlanan Firma</th>
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
                  <td class="p-2">${r.urunKodu || ''}</td>
                  <td class="p-2">${r.aciklama || ''}</td>
                  <td class="p-2">${r.musteri || ''}</td>
                  <td class="p-2">${r.adet || ''}</td>
                  <td class="p-2">${r.fire || ''}</td>
                  <td class="p-2">${r.patlatilanKutu || ''}</td>
                  <td class="p-2">${r.patlatilanFirma || ''}</td>
                  <td class="p-2">${r.hazirlananFirma || ''}</td>
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
  // wire delete buttons
  placeholder.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const savedAt = btn.getAttribute('data-savedat');
      if (!savedAt) return;
      btn.disabled = true;
      const res = await window.electronAPI.deletePaketleme(savedAt);
      if (res && res.ok && res.removed) { showToast('Kayıt silindi', 'success'); await loadList(); } else { showToast('Silme başarısız', 'error'); btn.disabled = false; }
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
    try { const resetBtn = form.querySelector('#paketleme-reset'); if (resetBtn) resetBtn.removeEventListener('click', resetHandler); } catch(e){}
    try { container.innerHTML = ''; } catch(e){}
    _cleanup = null;
  };
}

export async function unmount(container) {
  if (_cleanup) _cleanup();
}
