import { showToast } from '../ui/helpers.js';
import { createCycleTimesTable } from '../ui/tables/cycle-times-table.js';
import ApiClient from '../ui/core/api-client.js';
import { APP_CONFIG } from '../config/app-config.js';
import FormManager from '../ui/core/form-manager.js';
import DropdownManager from '../ui/managers/dropdown-manager.js';
import { createContext, destroyContext } from '../ui/core/event-manager.js';
import { validateCycleTime } from '../ui/core/validation-engine.js';

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
            <div class="relative">
              <input name="productCode" type="text" 
                     class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100 w-full" 
                     placeholder="Ürün kodunu yazın..." required />
              <div id="product-name-display" class="text-xs text-neutral-400 mt-1 min-h-4">
                <!-- Ürün adı burada görünecek -->
              </div>
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
  const productCodeInput = form.querySelector('[name="productCode"]');
  const productNameDisplay = form.querySelector('#product-name-display');

  // Merkezi sistemleri başlat
  const apiClient = new ApiClient(APP_CONFIG.API.BASE_URL);
  const dropdownManager = new DropdownManager(apiClient);
  
  // Ürün cache'i
  let productsCache = null;
  let cacheTimestamp = null;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

  // Ürünleri cache'e yükle
  const loadProductsCache = async () => {
    try {
      console.log('🔄 Loading products to cache...');
      const response = await apiClient.get('/Products');
      
      if (!response.success) {
        throw new Error(response.error || 'API çağrısı başarısız');
      }
      
      // API response formatını düzgün parse et
      let products = [];
      if (Array.isArray(response.data)) {
        products = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        products = response.data.data; // Nested data structure
      } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
        products = response.data.data;
      } else {
        console.error('❌ Unexpected API response format:', response);
        throw new Error('API\'den array formatında veri gelmiyor');
      }
      
      productsCache = products;
      cacheTimestamp = Date.now();
      
      console.log(`✅ Products cached: ${products.length} items`);
      
      // İlk 5 ürünün kod formatını debug için göster
      if (products.length > 0) {
        console.log('📋 Sample product codes:', products.slice(0, 5).map(p => ({
          id: p.id || p.Id,
          code: p.code || p.productCode || p.Code || p.ProductCode,
          name: p.name || p.productName || p.Name || p.ProductName,
          allFields: Object.keys(p)
        })));
      }
      
      return products;
    } catch (error) {
      console.error('❌ Products cache loading error:', error);
      throw error;
    }
  };

  // Cache'den ürün ara
  const searchProductInCache = (productCode) => {
    if (!productsCache) {
      console.log('❌ Cache is empty');
      return null;
    }
    
    console.log(`🔍 Searching for code: "${productCode}" in ${productsCache.length} products`);
    
    const foundProduct = productsCache.find(p => {
      const productCodeField = p.code || p.productCode || p.Code || p.ProductCode;
      const matches = productCodeField && productCodeField.toString().toUpperCase() === productCode.toUpperCase();
      
      if (matches) {
        console.log(`✅ Match found! Product code: "${productCodeField}" matches search: "${productCode}"`);
      }
      
      return matches;
    });
    
    if (!foundProduct) {
      // İlk 10 ürünün kodlarını göster
      console.log('❌ No match found. Available codes:', 
        productsCache.slice(0, 10).map(p => {
          const code = p.code || p.productCode || p.Code || p.ProductCode;
          return `"${code}"`;
        }).join(', ')
      );
    }
    
    return foundProduct;
  };

  // Cache'in güncel olup olmadığını kontrol et
  const isCacheValid = () => {
    return productsCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION;
  };

  // Tek ürün API endpoint'i ile arama
  const searchProductByCode = async (productCode) => {
    try {
      console.log(`🎯 Searching product by code endpoint: ${productCode}`);
      const response = await apiClient.get(`/Products/code/${encodeURIComponent(productCode)}`);
      
      if (!response.success) {
        return null; // Ürün bulunamadı
      }
      
      // Single product response
      let product = null;
      if (response.data) {
        product = response.data.data || response.data;
      }
      
      if (product) {
        console.log('✅ Product found via endpoint:', product);
        return product;
      }
      
      return null;
    } catch (error) {
      console.log('❌ Product endpoint search failed:', error.message);
      return null; // Endpoint hatası, cache'e fallback yapacağız
    }
  };
  
  // Ürün kodu girişi ve ürün adı gösterimi
  let productLookupTimeout = null;
  let foundProductId = null;

  eventContext.add(productCodeInput, 'input', async (e) => {
    const productCode = e.target.value.trim().toUpperCase();
    
    // Timeout'u temizle
    if (productLookupTimeout) {
      clearTimeout(productLookupTimeout);
    }

    if (!productCode) {
      productNameDisplay.textContent = '';
      foundProductId = null;
      return;
    }

    // 300ms sonra ürün araması yap
    productLookupTimeout = setTimeout(async () => {
      try {
        productNameDisplay.textContent = 'Aranıyor...';
        
        let foundProduct = null;
        
        // 1. Önce özel endpoint ile ara (en hızlı)
        foundProduct = await searchProductByCode(productCode);
        
        // 2. Endpoint başarısız olduysa cache'ten ara
        if (!foundProduct && isCacheValid()) {
          console.log('🎯 Fallback to cache search for:', productCode);
          foundProduct = searchProductInCache(productCode);
        }
        
        // 3. Cache'te de yoksa veya cache geçersizse, cache'i yükle ve ara
        if (!foundProduct && !isCacheValid()) {
          console.log('🔄 Cache miss or expired, loading from API...');
          productNameDisplay.textContent = 'Veriler yükleniyor...';
          
          try {
            await loadProductsCache();
            foundProduct = searchProductInCache(productCode);
          } catch (error) {
            console.log('⚠️ Cache load failed:', error.message);
            // Cache yüklenemezse direkt API'den ara (fallback)
            const response = await apiClient.get('/Products');
            
            if (response.success) {
              const products = response.data?.data || response.data;
              if (Array.isArray(products)) {
                foundProduct = products.find(p => {
                  const productCodeField = p.code || p.productCode || p.Code || p.ProductCode;
                  return productCodeField && productCodeField.toString().toUpperCase() === productCode;
                });
              }
            }
          }
        }
        
        // Sonucu göster
        if (foundProduct) {
          const productName = foundProduct.name || foundProduct.productName || foundProduct.Name || foundProduct.ProductName || 'İsimsiz Ürün';
          productNameDisplay.textContent = productName;
          productNameDisplay.className = 'text-xs text-green-400 mt-1 min-h-4';
          foundProductId = foundProduct.id || foundProduct.Id;
          console.log('✅ Product found:', foundProduct.id, productName);
        } else {
          productNameDisplay.textContent = 'Ürün bulunamadı';
          productNameDisplay.className = 'text-xs text-red-400 mt-1 min-h-4';
          foundProductId = null;
          console.log('❌ Product not found for code:', productCode);
        }
      } catch (err) {
        console.error('❌ Product lookup error:', err);
        productNameDisplay.textContent = 'Arama hatası: ' + err.message;
        productNameDisplay.className = 'text-xs text-red-400 mt-1 min-h-4';
        foundProductId = null;
      }
    }, 300);
  });
  
  // Form manager oluştur
  const formManager = FormManager.createForm(form, {
    validation: {
      schema: 'cycleTime',
      realTime: true
    },
    autoSave: false,
    showToastOnSuccess: false, // Manuel toast göstereceğiz
    submitHandler: async (formData) => {
      // Ürün kodu kontrolü
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
        foundProductId = null;
        
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
    foundProductId = null;
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
        foundProductId = null;
        
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

  // Cache refresh için Ctrl+Shift+R kısayolu ekle
  eventContext.add(document, 'keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      try {
        console.log('🔄 Manual cache refresh triggered');
        productsCache = null;
        cacheTimestamp = null;
        await loadProductsCache();
        showToast('Ürün cache\'i yenilendi', 'success');
      } catch (error) {
        showToast('Cache yenileme hatası: ' + error.message, 'error');
      }
    }
  });

  // Dropdownları doldur (sadece operasyonlar)
  await dropdownManager.populateOperations(form.querySelector('[name="operationId"]'));

  // Ürün cache'ini arka planda yükle (async)
  loadProductsCache().catch(error => {
    console.warn('⚠️ Products cache preload failed:', error);
  });

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
      
      // Cache'i temizle
      productsCache = null;
      cacheTimestamp = null;
      
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