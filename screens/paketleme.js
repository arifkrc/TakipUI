import { showToast } from '../ui/helpers.js';
import { createPackingsTable } from '../ui/tables/packings-table.js';
import ApiClient from '../ui/core/api-client.js';
import { APP_CONFIG } from '../config/app-config.js';
import FormManager from '../ui/core/form-manager.js';
import { createContext, destroyContext } from '../ui/core/event-manager.js';
import ProductInputComponent from '../ui/core/product-input.js';

let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Paketleme', 'Paketleme işlemleri ve takibi');

  // EventManager context oluştur
  const eventContext = createContext('packings-form');

  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Paketleme Kaydı Ekle</h3>
      <form id="packings-form" class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Tarih
            <input name="date" type="date" 
                   class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" 
                   required />
          </label>
          <label class="flex flex-col text-sm">Vardiya
            <select name="shift" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required>
              <option value="">Vardiya seçiniz...</option>
              <option value="00-08">00-08 (Gece Vardiyası)</option>
              <option value="08-16">08-16 (Gündüz Vardiyası)</option>
              <option value="16-24">16-24 (Akşam Vardiyası)</option>
            </select>
          </label>
          <label class="flex flex-col text-sm">Sorumlu
            <input name="supervisor" type="text" 
                   class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" 
                   placeholder="Sorumlu kişi" />
          </label>
        </div>
        
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Ürün Kodu
            <div id="product-input-container">
              <!-- Product input component buraya yerleştirilecek -->
            </div>
          </label>
          <label class="flex flex-col text-sm">Miktar
            <input name="quantity" type="number" min="1" 
                   class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" 
                   placeholder="Paketlenen miktar" required />
          </label>
          <div class="flex flex-col justify-end">
            <div class="grid grid-cols-2 gap-2">
              <label class="flex flex-col text-sm">Exploded From
                <input name="explodedFrom" type="text" 
                       class="mt-1 px-2 py-2 bg-neutral-800 rounded text-neutral-100 text-xs" 
                       placeholder="Kaynak" />
              </label>
              <label class="flex flex-col text-sm">Exploding To
                <input name="explodingTo" type="text" 
                       class="mt-1 px-2 py-2 bg-neutral-800 rounded text-neutral-100 text-xs" 
                       placeholder="Hedef" />
              </label>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Kaydet</button>
          <button type="button" id="packings-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="packings-list-placeholder" class="mt-6"></div>
    </div>
  `;

  const form = container.querySelector('#packings-form');
  const placeholder = container.querySelector('#packings-list-placeholder');
  const productInputContainer = container.querySelector('#product-input-container');

  // Merkezi sistemleri başlat
  const apiClient = new ApiClient(APP_CONFIG.API.BASE_URL);
  
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
      showToast('Ürün arama hatası', 'error');
    }
  });

  // Product input'u container'a ekle
  const { input: productCodeInput, display: productNameDisplay } = productInput.createProductInput(
    productInputContainer,
    {
      inputName: 'productCode',
      placeholder: 'PRD001',
      required: true
    }
  );

  // Tabloyu oluştur ve yükle
  const dataTable = createPackingsTable(APP_CONFIG.API.BASE_URL);
  placeholder.appendChild(dataTable);

  // Initialize table
  await dataTable.init();

  // Varsayılan tarih değerini bugün olarak ayarla
  const today = new Date();
  const localDate = today.toISOString().slice(0, 10); // YYYY-MM-DD formatı
  form.querySelector('[name="date"]').value = localDate;
  
  // Form manager oluştur
  const formManager = FormManager.createForm(form, {
    validation: {
      realTime: true
    },
    autoSave: false,
    submitHandler: async (formData) => {
      try {
        console.log('🔄 Submitting packing:', formData);

        // Form verilerini API formatına çevir
        const packingData = {
          date: formData.date ? new Date(formData.date + 'T00:00:00').toISOString() : new Date().toISOString(),
          shift: formData.shift?.trim() || null,
          supervisor: formData.supervisor?.trim() || null,
          productCode: formData.productCode?.trim().toUpperCase() || '',
          quantity: parseInt(formData.quantity) || 0,
          explodedFrom: formData.explodedFrom?.trim() || null,
          explodingTo: formData.explodingTo?.trim() || null
        };

        // Basit validasyon
        if (!packingData.date) {
          showToast('Tarih gerekli', 'error');
          return false;
        }
        if (!packingData.shift) {
          showToast('Vardiya seçimi gerekli', 'error');
          return false;
        }
        if (!packingData.productCode) {
          showToast('Ürün kodu gerekli', 'error');
          return false;
        }
        if (packingData.quantity <= 0) {
          showToast('Miktar 0\'dan büyük olmalı', 'error');
          return false;
        }
        
        // Merkezi component'ten ürün ID'sini al (validasyon için)
        const currentProductId = productInput.getFoundProductId();
        if (!currentProductId) {
          showToast('Geçerli bir ürün seçilmeli', 'error');
          return false;
        }

        console.log('📤 Final packing data being sent to API:', JSON.stringify(packingData, null, 2));

        // API'ye gönder
        const response = await apiClient.post('/Packings', packingData);
        
        if (response.success) {
          showToast('Paketleme kaydı başarıyla eklendi', 'success');
          form.reset();
          
          // Varsayılan değerleri tekrar ayarla
          const todayDate = new Date().toISOString().slice(0, 10);
          form.querySelector('[name="date"]').value = todayDate;
          
          productNameDisplay.textContent = ''; // Ürün bilgilerini temizle
          productInput.foundProductId = null; // Product ID'yi sıfırla
          
          // Tabloyu güncelle
          await dataTable.reload();
          
          return true;
        } else {
          throw new Error(response.error || 'Paketleme kaydı eklenemedi');
        }
        
      } catch (error) {
        console.error('❌ Packing save error:', error);
        showToast('Paketleme kaydetme hatası: ' + error.message, 'error');
        return false;
      }
    }
  });

  // Reset button handler
  const resetBtn = container.querySelector('#packings-reset');
  const resetHandler = () => {
    form.reset();
    formManager.clearErrors();
    
    // Varsayılan değerleri tekrar ayarla
    const todayDate = new Date().toISOString().slice(0, 10);
    form.querySelector('[name="date"]').value = todayDate;
    
    productNameDisplay.textContent = ''; // Ürün bilgilerini temizle
    productInput.foundProductId = null; // Product ID'yi sıfırla
  };
  resetBtn.addEventListener('click', resetHandler);

  // Cleanup fonksiyonu
  _cleanup = () => {
    try {
      eventContext.removeAll();
      destroyContext('packings-form');
      
      if (resetBtn && resetHandler) {
        resetBtn.removeEventListener('click', resetHandler);
      }
      
      // Product input component'i temizle
      if (productInput) {
        productInput.destroy();
      }
      
      if (formManager) {
        formManager.destroy();
      }
      
      container.innerHTML = '';
    } catch (err) {
      console.error('Cleanup error:', err);
    }
    _cleanup = null;
  };
}

export async function unmount(container) { 
  if (_cleanup) _cleanup(); 
}
