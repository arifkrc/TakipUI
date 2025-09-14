import { showToast } from '../ui/helpers.js';
import { createCycleTimesTable } from '../ui/tables/cycle-times-table.js';
import ApiClient from '../ui/core/api-client.js';
import { APP_CONFIG } from '../config/app-config.js';
import FormManager from '../ui/core/form-manager.js';
import DropdownManager from '../ui/managers/dropdown-manager.js';
import { createContext, destroyContext } from '../ui/core/event-manager.js';
import { validateCycleTime } from '../ui/core/validation-engine.js';
import ProductInputComponent from '../ui/core/product-input.js';
import productLookupService from '../ui/core/product-lookup.js';

let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Çevrim Zamanları', 'Operasyon çevrim sürelerini yönetin');

  // EventManager context oluştur
  const eventContext = createContext('cycle-times-form');

  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Çevrim Zamanı Ekle</h3>
      <form id="cycle-times-form" class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Operasyon
            <select name="operationId" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required>
              <option value="">Operasyon seçiniz...</option>
            </select>
          </label>
          <label class="flex flex-col text-sm">Ürün Kodu
            <div id="product-input-container">
              <!-- Product input component buraya yerleştirilecek -->
            </div>
          </label>
          <label class="flex flex-col text-sm">Çevrim Süresi (Saniye)
            <input name="second" type="number" min="1" max="86400" 
                   class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" 
                   placeholder="Saniye cinsinden" required />
          </label>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Kaydet</button>
          <button type="button" id="cycle-times-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="cycle-times-list-placeholder" class="mt-6"></div>
    </div>
  `;

  const form = container.querySelector('#cycle-times-form');
  const placeholder = container.querySelector('#cycle-times-list-placeholder');
  const productInputContainer = container.querySelector('#product-input-container');

  // Merkezi sistemleri başlat
  const apiClient = new ApiClient(APP_CONFIG.API.BASE_URL);
  const dropdownManager = new DropdownManager(apiClient);
  
  // Merkezi Product Input Component'i oluştur
  const productInput = new ProductInputComponent({
    onProductFound: (product) => {
      console.log('✅ Product found via component:', product);
    },
    onProductNotFound: (productCode) => {
      console.log('❌ Product not found via component:', productCode);
    },
    onError: (error) => {
      console.error('❌ Product lookup error via component:', error);
    }
  });

  // Product input'u container'a ekle
  const { input: productCodeInput, display: productNameDisplay } = productInput.createProductInput(
    productInputContainer,
    {
      inputName: 'productCode',
      placeholder: 'Ürün kodunu yazın...',
      required: true
    }
  );

  // Form manager oluştur
  const formManager = FormManager.createForm(form, {
    validation: {
      schema: 'cycleTime',
      realTime: true
    },
    autoSave: false,
    showToastOnSuccess: false, // Manuel toast göstereceğiz
    submitHandler: async (formData) => {
      // Ürün kodu kontrolü - merkezi component'ten ID al
      const foundProductId = productInput.getFoundProductId();
      if (!foundProductId) {
        showToast('Geçerli bir ürün kodu giriniz', 'error');
        return false;
      }

      // Form data'ya product ID'yi ekle
      const processedFormData = {
        ...formData,
        productId: foundProductId
      };

      // Validation
      const validationResult = await validateCycleTime(processedFormData, {
        apiClient: apiClient
      });

      if (!validationResult.isValid) {
        const errorMessages = validationResult.errors.map(err => err.message).join('\n');
        showToast('Validation hatası:\n' + errorMessages, 'error');
        return false;
      }

      // API payload hazırlama
      const payload = {
        operationId: parseInt(processedFormData.operationId),
        productId: parseInt(processedFormData.productId),
        second: parseInt(processedFormData.second)
      };

      console.log('📤 Sending cycle time data:', payload);

      // API call
      try {
        const result = await apiClient.post('/CycleTimes', payload);
        console.log('✅ Cycle time save response:', result);
        
        showToast('Çevrim zamanı başarıyla kaydedildi', 'success');
        form.reset();
        productNameDisplay.textContent = '';
        productInput.foundProductId = null;
        
        // Yeni kaydı tabloya ekle (backend isteği atmadan)
        if (result.data && result.data.id) {
          await addRecordToTable(result.data, processedFormData);
        } else {
          // Eğer API response'unda yeni kayıt yoksa reload yap
          await dataTable.reload();
        }
        
        return true;
      } catch (err) {
        console.error('❌ Cycle time save error:', err);
        
        // 409 Conflict - Aynı ürün-operasyon kombinasyonu mevcut
        if (err.status === 409 || (err.response && err.response.status === 409)) {
          const conflictData = err.response?.data || err.data || {};
          const message = conflictData.message || 'Bu ürün-operasyon kombinasyonu zaten mevcut';
          
          console.log('⚠️ Conflict detected:', conflictData);
          
          // Kullanıcıya güncelleme seçeneği sun
          const shouldUpdate = await showConflictDialog(
            processedFormData, 
            message,
            conflictData.errors || []
          );
          
          if (shouldUpdate) {
            // Mevcut kaydı güncelle
            await updateExistingRecord(processedFormData);
            return true;
          }
          
          return false;
        }
        
        // Diğer hatalar
        const errorMessage = err.response?.data?.message || err.message || 'Bilinmeyen hata';
        showToast('Kaydetme hatası: ' + errorMessage, 'error');
        return false;
      }
    }
  });

  // Reset button handler
  eventContext.add(container.querySelector('#cycle-times-reset'), 'click', () => {
    formManager.reset();
    productNameDisplay.textContent = '';
    productNameDisplay.className = 'text-xs text-neutral-400 mt-1 min-h-4';
    productInput.foundProductId = null;
  });

  // Conflict dialog - Kullanıcıya güncelleme seçeneği sun
  async function showConflictDialog(formData, message, errors) {
    return new Promise((resolve) => {
      // Modal overlay oluştur
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      
      // Modal content
      const modal = document.createElement('div');
      modal.className = 'bg-neutral-800 rounded-lg p-6 max-w-md mx-4 text-white';
      
      // Operasyon ve ürün bilgileri
      const operationName = container.querySelector('[name="operationId"] option:checked')?.textContent || 'Bilinmeyen Operasyon';
      const productCode = formData.productCode;
      const productName = container.querySelector('#product-name-display')?.textContent || '';
      const newSeconds = formData.second;
      
      modal.innerHTML = `
        <div class="mb-4">
          <h3 class="text-lg font-semibold text-yellow-400 mb-2">⚠️ Çevrim Zamanı Zaten Mevcut</h3>
          <div class="text-sm text-neutral-300 space-y-1">
            <p><strong>Ürün:</strong> ${productCode} - ${productName}</p>
            <p><strong>Operasyon:</strong> ${operationName}</p>
            <p><strong>Yeni Süre:</strong> ${newSeconds} saniye</p>
          </div>
        </div>
        
        <div class="mb-4 text-sm text-neutral-400">
          <p>${message}</p>
          ${errors.length > 0 ? `<ul class="mt-2 list-disc list-inside">${errors.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
        </div>
        
        <div class="mb-4 p-3 bg-blue-900 bg-opacity-50 rounded text-sm">
          <p class="text-blue-300"><strong>💡 Seçenekler:</strong></p>
          <p>• <strong>Güncelle:</strong> Mevcut çevrim zamanını yeni değerle günceller</p>
          <p>• <strong>İptal:</strong> Değişiklik yapmadan geri döner</p>
        </div>
        
        <div class="flex gap-2 justify-end">
          <button id="conflict-cancel" class="px-4 py-2 bg-neutral-600 hover:bg-neutral-500 rounded text-sm">İptal</button>
          <button id="conflict-update" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm">🔄 Güncelle</button>
        </div>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      // Event listeners
      modal.querySelector('#conflict-cancel').addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(false);
      });
      
      modal.querySelector('#conflict-update').addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(true);
      });
      
      // ESC key ile kapatma
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          document.body.removeChild(overlay);
          document.removeEventListener('keydown', handleEscape);
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
  }
  
  // Mevcut kaydı güncelle
  async function updateExistingRecord(formData) {
    try {
      console.log('🔄 Updating existing cycle time record');
      
      // Önce mevcut kaydı bul
      const foundProductId = productInput.getFoundProductId();
      const existingRecord = await findExistingRecord(formData.operationId, foundProductId);
      
      if (!existingRecord) {
        showToast('Güncellenecek kayıt bulunamadı', 'error');
        return false;
      }
      
      // PUT request ile güncelle
      const updatePayload = {
        operationId: parseInt(formData.operationId),
        productId: parseInt(foundProductId),
        second: parseInt(formData.second)
      };
      
      console.log('📤 Updating cycle time:', existingRecord.id, updatePayload);
      
      const result = await apiClient.put(`/CycleTimes/${existingRecord.id}`, updatePayload);
      
      if (result.success) {
        console.log('✅ Cycle time updated successfully');
        showToast('Çevrim zamanı başarıyla güncellendi', 'success');
        
        // Formu temizle
        form.reset();
        productNameDisplay.textContent = '';
        productInput.foundProductId = null;
        
        // Tabloyu yenile
        await dataTable.reload();
        return true;
      } else {
        throw new Error(result.error || 'Güncelleme başarısız');
      }
      
    } catch (error) {
      console.error('❌ Update error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Güncelleme hatası';
      showToast('Güncelleme hatası: ' + errorMessage, 'error');
      return false;
    }
  }
  
  // Mevcut kaydı bul
  async function findExistingRecord(operationId, productId) {
    try {
      const result = await apiClient.get('/CycleTimes');
      if (result.success && result.data) {
        const records = Array.isArray(result.data) ? result.data : (result.data.data || []);
        return records.find(r => 
          r.operationId == operationId && 
          r.productId == productId && 
          r.isActive !== false
        );
      }
      return null;
    } catch (error) {
      console.error('Error finding existing record:', error);
      return null;
    }
  }

  // Table data manipulation helper function
  async function addRecordToTable(newRecord, formData) {
    try {
      // Operasyon bilgilerini cache'den al
      const operations = await dropdownManager.getOperations();
      const operation = operations.find(op => op.id == formData.operationId);
      
      // Ürün bilgilerini cache'den al  
      const productName = container.querySelector('#product-name-display').textContent;
      
      // Complete record object oluştur
      const completeRecord = {
        id: newRecord.id,
        operationShortCode: operation?.shortCode || '',
        operationName: operation?.name || '',
        productCode: formData.productCode,
        productName: productName,
        second: newRecord.second || formData.second,
        addedDateTime: newRecord.addedDateTime || new Date().toISOString(),
        isActive: true
      };
      
      // Tablonun iç datasına ekle
      if (dataTable && dataTable.addRecord) {
        dataTable.addRecord(completeRecord);
        console.log('✅ Record added to table without backend call');
      } else {
        // Fallback: full reload
        await dataTable.reload();
      }
    } catch (error) {
      console.warn('⚠️ Could not add record to table, falling back to reload:', error);
      await dataTable.reload();
    }
  }

  // Dropdownları doldur (sadece operasyonlar)
  await dropdownManager.populateOperations(form.querySelector('[name="operationId"]'));

  // Data table oluştur (merkezi sistem kullanarak)
  const dataTable = createCycleTimesTable(APP_CONFIG.API.BASE_URL);
  placeholder.appendChild(dataTable);

  // Initialize
  await dataTable.init();

  _cleanup = () => {
    try { 
      formManager.destroy();
      eventContext.removeAll();
      destroyContext('cycle-times-form');
      
      // Product input component'i temizle
      if (productInput) {
        productInput.destroy();
      }
      
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