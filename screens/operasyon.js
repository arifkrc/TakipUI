import { showToast } from '../ui/helpers.js';
import { createOperationsTable } from '../ui/tables/operations-table.js';
import ApiClient from '../ui/core/api-client.js';
import { APP_CONFIG } from '../config/app-config.js';
import FormManager from '../ui/core/form-manager.js';
import { createContext, destroyContext } from '../ui/core/event-manager.js';
import { validateOperation } from '../ui/core/validation-engine.js';

let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Operasyonlar', 'Operasyon tanımları');

  // EventManager context oluştur
  const eventContext = createContext('operation-form');

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

  // Merkezi sistemleri başlat
  const apiClient = new ApiClient(APP_CONFIG.API.BASE_URL);
  
  // Form manager oluştur
  const formManager = FormManager.createForm(form, {
    validation: {
      schema: 'operation',
      realTime: true
    },
    autoSave: false,
    submitHandler: async (formData) => {
      // Validation
      const validationResult = await validateOperation(formData, {
        checkUnique: true,
        apiClient: apiClient
      });

      if (!validationResult.isValid) {
        const errorMessages = validationResult.errors.map(err => err.message).join('\n');
        showToast('Validation hatası:\n' + errorMessages, 'error');
        return false;
      }

      // API payload hazırlama
      const payload = {
        name: formData.operasyonAdi,
        shortCode: formData.operasyonKodu
      };

      // API call
      try {
        const result = await apiClient.post('/Operations/entry', payload);
        showToast('Operasyon başarıyla kaydedildi', 'success');
        form.reset();
        await dataTable.reload();
        return true;
      } catch (err) {
        showToast('Kaydetme hatası: ' + err.message, 'error');
        return false;
      }
    }
  });

  // Reset button handler
  eventContext.add(container.querySelector('#operasyon-reset'), 'click', () => {
    formManager.reset();
  });

  // Data table oluştur (merkezi sistem kullanarak)
  const dataTable = createOperationsTable(APP_CONFIG.API.BASE_URL);
  placeholder.appendChild(dataTable);

  // Initialize
  await dataTable.init();

  _cleanup = () => {
    try { 
      formManager.destroy();
      eventContext.destroy(); // cleanup yerine destroy
      destroyContext('operation-form');
      container.innerHTML = ''; 
    } catch(e) {
      console.error('Cleanup error:', e);
    }
    _cleanup = null;
  };
}

export async function unmount(container) { 
  if (_cleanup) _cleanup(); 
}