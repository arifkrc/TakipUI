import { showToast, showFormErrors, clearFormErrors } from '../ui/simple-table.js';
import { createOperationsTable } from '../ui/tables/operations-table.js';
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
  const dataTable = createOperationsTable(API_BASE_URL);

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