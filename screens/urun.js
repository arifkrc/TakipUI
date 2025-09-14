import { createRowCountSelector, createPaginationControls, showToast } from '../ui/helpers.js';
import { createProductsTable } from '../ui/tables/products-table.js';
let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Ürünler', 'Ürün tanımları');

  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Ürün Ekle</h3>
      <form id="urun-form" class="space-y-4">
        <div class="grid grid-cols-4 gap-4">
          <label class="flex flex-col text-sm">Ürün Kodu<input name="productCode" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
          <label class="flex flex-col text-sm">Ürün Adı<input name="name" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
          <label class="flex flex-col text-sm">Ürün Tipi
            <select name="type" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required>
              <option value="">Seçiniz...</option>
              <option value="DİSK">DİSK</option>
              <option value="KAMPANA">KAMPANA</option>
              <option value="POYRA">POYRA</option>
            </select>
          </label>
          <label class="flex flex-col text-sm">Son Operasyon
            <select name="lastOperationId" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required>
              <option value="">Operasyon seçiniz...</option>
            </select>
          </label>
        </div>

        <div class="grid grid-cols-1 gap-4">
          <label class="flex flex-col text-sm">Açıklama<textarea name="description" rows="2" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" placeholder="Ürün açıklaması (opsiyonel)"></textarea></label>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Kaydet</button>
          <button type="button" id="urun-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="urun-list-placeholder" class="mt-6"></div>
    </div>
  `;

  const form = container.querySelector('#urun-form');
  const placeholder = container.querySelector('#urun-list-placeholder');

  // API configuration
  const API_BASE_URL = 'https://localhost:7287/api';

  // Load operations for dropdown
  async function loadOperations() {
    const operationSelect = form.querySelector('[name="lastOperationId"]');
    try {
      const response = await fetch(`${API_BASE_URL}/Operations`);
      if (!response.ok) throw new Error('Operations yüklenemedi');
      
      const result = await response.json();
      const operations = result.success ? result.data : [];

      operationSelect.innerHTML = '<option value="">Operasyon seçiniz...</option>';
      operations.forEach(op => {
        const option = document.createElement('option');
        option.value = op.id;
        option.textContent = `${op.name} (${op.shortCode || op.id})`;
        operationSelect.appendChild(option);
      });
    } catch (err) {
      console.error('Operations load error:', err);
      operationSelect.innerHTML = '<option value="">Operasyon yüklenemedi</option>';
      showToast('Operasyonlar yüklenirken hata oluştu', 'error');
    }
  }

  // Submit handler for adding new product
  async function submitHandler(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Kaydediliyor...';
    
    try {
      const payload = {
        productCode: data.productCode,
        name: data.name,
        type: data.type,
        description: data.description || '',
        lastOperationId: data.lastOperationId ? parseInt(data.lastOperationId) : null
      };

      const response = await fetch(`${API_BASE_URL}/Products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        showToast('Ürün başarıyla kaydedildi', 'success');
        form.reset();
        await dataTable.reload();
      } else {
        throw new Error(result.message || 'Kaydetme hatası');
      }
    } catch (err) {
      console.error('Save error:', err);
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
  container.querySelector('#urun-reset').addEventListener('click', resetHandler);

  // Create data table with merkezileştirilmiş tablo yapısı
  const dataTable = createProductsTable(API_BASE_URL);
  placeholder.appendChild(dataTable);

  // Initialize
  await loadOperations();
  await dataTable.init();

  _cleanup = () => {
    try { form.removeEventListener('submit', submitHandler); } catch(e){}
    try { const resetBtn = container.querySelector('#urun-reset'); if (resetBtn) resetBtn.removeEventListener('click', resetHandler); } catch(e){}
    try { container.innerHTML = ''; } catch(e){}
    _cleanup = null;
  };
}

export async function unmount(container) { 
  if (_cleanup) _cleanup(); 
}