import { createRowCountSelector, showToast, createPaginationControls } from '../ui/helpers.js';

let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Üretim - Paket Farkı', 'Üretim ve paketleme arasındaki farklar');
  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Üretim - Paketleme Farkı</h3>
      <div id="farki-controls" class="mb-3"></div>
      <div id="farki-table"></div>
    </div>
  `;

  const controls = container.querySelector('#farki-controls');
  const tableWrap = container.querySelector('#farki-table');

  const { wrapper: selectorWrap, select } = createRowCountSelector(20);
  const searchWrap = document.createElement('div');
  searchWrap.className = 'ml-2';
  searchWrap.innerHTML = `<input type="search" placeholder="Tabloda ara..." class="px-3 py-2 rounded bg-neutral-800 text-neutral-200" />`;
  const searchInput = searchWrap.querySelector('input');
  const topRow = document.createElement('div'); topRow.className = 'flex items-center gap-2'; topRow.appendChild(selectorWrap); topRow.appendChild(searchWrap);
  controls.appendChild(topRow);

  let pageSize = (select.value === 'all') ? 1 : Number(select.value || 20);
  let currentPage = 1;
  const pager = createPaginationControls(0, pageSize, currentPage, (p) => { currentPage = p; loadAndRender(); });
  controls.appendChild(pager);
  const debugInfo = document.createElement('div'); debugInfo.className = 'text-sm text-neutral-400 mt-1'; controls.appendChild(debugInfo);

  async function loadAndRender() {
    tableWrap.innerHTML = '<div class="p-4 text-neutral-400">Yükleniyor...</div>';
    try {
      const [uRes, pRes] = await Promise.all([window.electronAPI.listUretim(), window.electronAPI.listPaketleme()]);
      if (!uRes || !uRes.ok) { tableWrap.innerHTML = '<div class="text-rose-400">Üretim verisi alınamadı</div>'; return; }
      if (!pRes || !pRes.ok) { tableWrap.innerHTML = '<div class="text-rose-400">Paketleme verisi alınamadı</div>'; return; }

      const u = uRes.records || [];
      const p = pRes.records || [];

      // aggregate by product code (urunKodu) and optional date
      const keyFor = (r) => `${(r.urunKodu||'').trim()}|${(r.tarih||'').trim()}`;
      const aggU = {};
      for (const r of u) {
        const k = keyFor(r);
        aggU[k] = (aggU[k] || 0) + (Number(r.uretimAdedi) || 0);
      }
      const aggP = {};
      for (const r of p) {
        const k = keyFor(r);
        aggP[k] = (aggP[k] || 0) + (Number(r.adet) || 0);
      }

      // build rows: union of keys
      const keys = Array.from(new Set(Object.keys(aggU).concat(Object.keys(aggP))));
      const rows = keys.map(k => {
        const [urunKodu, tarih] = k.split('|');
        const uAdet = aggU[k] || 0;
        const pAdet = aggP[k] || 0;
        return { urunKodu, tarih, uAdet, pAdet, fark: uAdet - pAdet };
      }).sort((a,b) => b.fark - a.fark);

  const q = (searchInput && searchInput.value || '').trim().toLowerCase();
  const filtered = q ? rows.filter(r => {
    return ['urunKodu','tarih'].some(k => String(r[k] || '').toLowerCase().includes(q));
  }) : rows;
  const limit = select.value;
  pageSize = (limit === 'all') ? filtered.length || 1 : Number(limit || 20);
  const start = (currentPage - 1) * pageSize;
  const slice = (limit === 'all') ? filtered : filtered.slice(start, start + pageSize);

  try { pager.update(filtered.length, pageSize, currentPage); } catch(e) {}
  try { debugInfo.textContent = `Toplam: ${filtered.length}, SayfaBoyutu: ${pageSize}, Sayfa: ${currentPage}`; } catch(e) {}
  const html = `
        <div class="overflow-auto bg-neutral-800 p-2 rounded">
          <table class="w-full text-left text-sm">
            <thead class="text-neutral-400">
              <tr>
                <th class="p-2">Ürün Kodu</th>
                <th class="p-2">Tarih</th>
                <th class="p-2">Üretim (Adet)</th>
                <th class="p-2">Paketleme (Adet)</th>
                <th class="p-2">Fark (Üretim - Paket)</th>
              </tr>
            </thead>
            <tbody>
              ${slice.map(r => `
                <tr class="border-t border-neutral-700">
                  <td class="p-2">${r.urunKodu || ''}</td>
                  <td class="p-2">${r.tarih || ''}</td>
                  <td class="p-2">${r.uAdet}</td>
                  <td class="p-2">${r.pAdet}</td>
                  <td class="p-2">${r.fark}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

    tableWrap.innerHTML = html;
    pager.update(rows.length, pageSize, currentPage);
    } catch (err) {
      tableWrap.innerHTML = '<div class="text-rose-400">Liste oluşturulurken hata</div>';
      showToast('Fark listesi yüklenirken hata: ' + String(err), 'error');
    }
  }

  // initial render and wire selector
  await loadAndRender();
  select.addEventListener('change', () => { currentPage = 1; pager.update(0, (select.value==='all'?1:Number(select.value)), currentPage); loadAndRender(); });
  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; loadAndRender(); });

  _cleanup = () => {
    try { select.removeEventListener('change', () => loadAndRender(select.value)); } catch (e) {}
    try { container.innerHTML = ''; } catch (e) {}
    _cleanup = null;
  };
}

export async function unmount(container) {
  if (_cleanup) _cleanup();
}
