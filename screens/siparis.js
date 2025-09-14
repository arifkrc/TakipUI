import { showToast } from '../ui/helpers.js';
import { createOrdersTable } from '../ui/tables/orders-table.js';
import ApiClient from '../ui/core/api-client.js';
import { APP_CONFIG } from '../config/app-config.js';
import FormManager from '../ui/core/form-manager.js';
import { createContext, destroyContext } from '../ui/core/event-manager.js';
import ProductInputComponent from '../ui/core/product-input.js';

let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Siparişler', 'Sipariş yönetimi ve takibi');

  // EventManager context oluştur
  const eventContext = createContext('orders-form');

  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Sipariş Ekle</h3>
      <form id="siparis-form" class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Belge No
            <input name="documentNo" type="text" 
                   class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" 
                   placeholder="DOC001" required />
          </label>
          <label class="flex flex-col text-sm">Müşteri
            <input name="customer" type="text" 
                   class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" 
                   placeholder="Müşteri adı" required />
          </label>
          <label class="flex flex-col text-sm">Hafta
            <input name="orderAddedDateTime" type="text" 
                   class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" 
                   placeholder="37.HAFTA" required />
          </label>
        </div>
        
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Ürün Kodu
            <div id="product-input-container">
              <!-- Product input component buraya yerleştirilecek -->
            </div>
          </label>
          <label class="flex flex-col text-sm">Sipariş Adeti
            <input name="orderCount" type="number" min="0" 
                   class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" 
                   placeholder="0" />
          </label>
          <label class="flex flex-col text-sm">Tamamlanan
            <input name="completedQuantity" type="number" min="0" 
                   class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" 
                   placeholder="0" />
          </label>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <label class="flex flex-col text-sm">Devir
            <input name="carryover" type="number" min="0" 
                   class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" 
                   placeholder="0" />
          </label>
          <label class="flex flex-col text-sm">Varyantlar
            <textarea name="variants" rows="2"
                      class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" 
                      placeholder="Varyant bilgileri"></textarea>
          </label>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Kaydet</button>
          <button type="button" id="siparis-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="siparis-list-placeholder" class="mt-6"></div>
    </div>
  `;

  const form = container.querySelector('#siparis-form');
  const placeholder = container.querySelector('#siparis-list-placeholder');
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
  const dataTable = createOrdersTable(APP_CONFIG.API.BASE_URL);
  placeholder.appendChild(dataTable);

  // Initialize table
  await dataTable.init();
  
  // Form manager oluştur
  const formManager = FormManager.createForm(form, {
    validation: {
      realTime: true
    },
    autoSave: false,
    submitHandler: async (formData) => {
      try {
        console.log('🔄 Submitting order:', formData);

        // Form verilerini API formatına çevir
        const orderData = {
          orderAddedDateTime: formData.orderAddedDateTime?.trim() || '', // Hafta bilgisi (örn: "37.HAFTA")
          documentNo: formData.documentNo?.trim() || '',
          customer: formData.customer?.trim() || '',
          productCode: formData.productCode?.trim().toUpperCase() || '',
          variants: formData.variants?.trim() || '',
          orderCount: parseInt(formData.orderCount) || 0,
          completedQuantity: parseInt(formData.completedQuantity) || 0,
          carryover: parseInt(formData.carryover) || 0
        };

        // Basit validasyon
        if (!orderData.orderAddedDateTime) {
          showToast('Hafta bilgisi gerekli', 'error');
          return false;
        }
        if (!orderData.documentNo) {
          showToast('Belge numarası gerekli', 'error');
          return false;
        }
        if (!orderData.customer) {
          showToast('Müşteri adı gerekli', 'error');
          return false;
        }
        if (!orderData.productCode) {
          showToast('Ürün kodu gerekli', 'error');
          return false;
        }
        
        // Merkezi component'ten ürün ID'sini al
        const currentProductId = productInput.getFoundProductId();
        if (!currentProductId) {
          showToast('Geçerli bir ürün seçilmeli', 'error');
          return false;
        }

        // Product ID'yi orderData'ya ekle
        orderData.productId = currentProductId;

        console.log('📤 Final order data being sent to API:', JSON.stringify(orderData, null, 2));

        // API'ye gönder
        const response = await apiClient.post('/Orders', orderData);
        
        if (response.success) {
          showToast('Sipariş başarıyla eklendi', 'success');
          form.reset();
          productNameDisplay.textContent = ''; // Ürün bilgilerini temizle
          productInput.foundProductId = null; // Product ID'yi sıfırla
          
          // Tabloyu güncelle
          await dataTable.reload();
          
          return true;
        } else {
          throw new Error(response.error || 'Sipariş eklenemedi');
        }
        
      } catch (error) {
        console.error('❌ Order save error:', error);
        showToast('Sipariş kaydetme hatası: ' + error.message, 'error');
        return false;
      }
    }
  });

  // Reset button handler
  const resetBtn = container.querySelector('#siparis-reset');
  const resetHandler = () => {
    form.reset();
    formManager.clearErrors();
    productNameDisplay.textContent = ''; // Ürün bilgilerini temizle
    productInput.foundProductId = null; // Product ID'yi sıfırla
  };
  resetBtn.addEventListener('click', resetHandler);

  // Cleanup fonksiyonu
  _cleanup = () => {
    try {
      eventContext.removeAll();
      destroyContext('orders-form');
      
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
