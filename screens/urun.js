import { showToast } from '../ui/helpers.js';
import { createProductsTable } from '../ui/tables/products-table.js';
import ApiClient from '../ui/core/api-client.js';
import { APP_CONFIG } from '../config/app-config.js';
import FormManager from '../ui/core/form-manager.js';
import DropdownManager from '../ui/managers/dropdown-manager.js';
import { createContext, destroyContext } from '../ui/core/event-manager.js';
import { validateProduct } from '../ui/core/validation-engine.js';

let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Ürünler', 'Ürün tanımları');

  // EventManager context oluştur
  const eventContext = createContext('product-form');

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

  // Merkezi sistemleri başlat
  const apiClient = new ApiClient(APP_CONFIG.API.BASE_URL);
  const dropdownManager = new DropdownManager(apiClient);
  
  // Form manager oluştur
  const formManager = FormManager.createForm(form, {
    validation: {
      schema: 'product',
      realTime: true
    },
    autoSave: false,
    submitHandler: async (formData) => {
      // Validation
      const validationResult = await validateProduct(formData, {
        checkCodeTypeMatch: true,
        checkUnique: true,
        apiClient: apiClient
      });

      if (!validationResult.isValid) {
        const errorMessages = validationResult.errors.map(err => err.message).join('\n');
        showToast('Validation hatası:\n' + errorMessages, 'error');
        return false;
      }

      // API call
      try {
        const result = await apiClient.post('/Products', formData);
        showToast('Ürün başarıyla kaydedildi', 'success');
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
  eventContext.add(container.querySelector('#urun-reset'), 'click', () => {
    formManager.reset();
  });

  // Dropdownları doldur
  await dropdownManager.populateProductTypes(form.querySelector('[name="type"]'));
  await dropdownManager.populateOperations(form.querySelector('[name="lastOperationId"]'));

  // Data table oluştur (merkezi sistem kullanarak)
  const dataTable = createProductsTable(APP_CONFIG.API.BASE_URL);
  placeholder.appendChild(dataTable);

  // Initialize
  await dataTable.init();

  _cleanup = () => {
    try { 
      formManager.destroy();
      eventContext.destroy();
      destroyContext('product-form');
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