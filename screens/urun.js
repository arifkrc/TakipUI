import { showToast, showFormErrors, clearFormErrors } from '../ui/simple-table.js';
import { createProductsTable, getProductTypeFromCode, validateProductCodeAndType } from '../ui/tables/products-table.js';
let _cleanup = null;

export async function mount(container, { setHeader }) {
  setHeader('Ürünler', 'Ürün tanımları');

  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Ürün Ekle</h3>
      </br>
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
              <option value="">Yükleniyor...</option>
            </select>
          </label>
        </div>

        <div class="grid grid-cols-1 gap-4">
          <label class="flex flex-col text-sm">Açıklama<textarea name="description" rows="2" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" placeholder="Ürün açıklaması (opsiyonel)"></textarea></label>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Kaydet</button>
          </br></br></br>
          <button type="button" id="urun-reset" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="urun-list-placeholder"></div>
    </div>
  `;

  const form = container.querySelector('#urun-form');
  const placeholder = container.querySelector('#urun-list-placeholder');

  // API configuration
  const API_BASE_URL = 'https://localhost:7287/api';

  // Operasyonları yükle
  async function loadOperations() {
    const operationSelect = form.querySelector('[name="lastOperationId"]');
    
    try {
      const url = `${API_BASE_URL}/Operations?status=active`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const apiResponse = await response.json();
      const operations = apiResponse?.data || [];

      // Operasyon dropdown'ını doldur
      operationSelect.innerHTML = '<option value="">Operasyon seçiniz...</option>';
      operations.forEach(op => {
        const option = document.createElement('option');
        option.value = op.id;
        option.textContent = `${op.name} (${op.shortCode})`;
        operationSelect.appendChild(option);
      });

      console.log('✅ Operations loaded:', operations.length);

    } catch (err) {
      console.error('❌ LOAD OPERATIONS ERROR:', err);
      operationSelect.innerHTML = '<option value="">Operasyon yüklenemedi</option>';
      showToast('Operasyonlar yüklenirken hata oluştu', 'error');
    }
  }

  async function submitHandler(e) {
    e.preventDefault();
    console.log('🚀 Form submit başladı');
    clearFormErrors(form);
    
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    console.log('📋 Form data:', data);

    const errors = [];
    if (!data.productCode) errors.push({ field: 'productCode', msg: 'Ürün kodu gerekli' });
    if (!data.name) errors.push({ field: 'name', msg: 'Ürün adı gerekli' });
    if (!data.type) errors.push({ field: 'type', msg: 'Ürün tipi seçimi gerekli' });
    if (!data.lastOperationId) errors.push({ field: 'lastOperationId', msg: 'Son operasyon seçimi gerekli' });
    
    if (errors.length) { 
      console.log('❌ Validation errors:', errors);
      showFormErrors(form, errors); 
      return;
    }

    console.log('✅ Validation passed, proceeding...');

    // Ürün kodu ve tip uyumluluğunu kontrol et
    const validation = validateProductCodeAndType(data.productCode, data.type);
    
    if (!validation.isValid || validation.warning) {
      const message = validation.warning || `Kod-tip uyumsuzluğu: Beklenen "${validation.expectedType}", Seçilen "${data.type}"`;
      showToast(`⚠️ UYARI: ${message} - Kayıt devam ediyor...`, 'warning');
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; 
    submitBtn.textContent = 'Kaydediliyor...';
    
    try {
      const payload = {
        productCode: data.productCode,
        name: data.name,
        type: data.type,
        description: data.description || '',
        lastOperationId: data.lastOperationId ? parseInt(data.lastOperationId) : null // Convert to integer
      };

      const url = `${API_BASE_URL}/Products`;
      console.log('🔗 API REQUEST URL:', url);
      console.log('📤 PAYLOAD:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('📥 RESPONSE STATUS:', response.status, response.statusText);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.log('❌ RESPONSE ERROR BODY:', responseText);
        
        let errorMessage = 'Kaydetme hatası oluştu';
        
        // HTTP 409 (Conflict) durumunda özel mesaj
        if (response.status === 409) {
          errorMessage = `Ürün kodu "${data.productCode}" zaten mevcut. Lütfen farklı bir kod girin.`;
        } else {
          // Diğer hatalar için genel mesaj
          errorMessage = `HTTP ${response.status}: Kaydetme hatası - ${responseText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log('✅ SUCCESS RESPONSE:', responseData);
      
      showToast('Ürün başarıyla kaydedildi', 'success');
      form.reset();
      await dataTable.reload();
      
    } catch (err) {
      console.error('❌ CREATE PRODUCT ERROR:', err);
      showToast('Kaydetme hatası: ' + err.message, 'error');
    } finally { 
      submitBtn.disabled = false; 
      submitBtn.textContent = 'Kaydet'; 
    }
  }

  function resetHandler() { 
    form.reset(); 
    // Operasyonları yeniden yükle
    loadOperations();
  }

  form.addEventListener('submit', submitHandler);
  container.querySelector('#urun-reset').addEventListener('click', resetHandler);
  
  console.log('📋 Form event listeners attached');
  console.log('🔍 Form element:', form);
  console.log('🔍 Submit button:', form.querySelector('button[type="submit"]'));

  // Ürün kodu değiştiğinde otomatik tip önerisi
  const productCodeInput = form.querySelector('[name="productCode"]');
  const typeSelect = form.querySelector('[name="type"]');
  
  productCodeInput.addEventListener('input', (e) => {
    const productCode = e.target.value;
    const suggestedType = getProductTypeFromCode(productCode);
    
    if (suggestedType && typeSelect.value === '') {
      // Sadece tip seçilmemişse otomatik öneri yap
      typeSelect.value = suggestedType;
      showToast(`Ürün tipi otomatik "${suggestedType}" olarak ayarlandı`, 'info');
    }
  });

  // Form reset butonunu güncelleyelim ki operasyon seçimi de temizlensin
  function resetHandler() { 
    form.reset(); 
    // Operasyonları yeniden yükle
    loadOperations();
  }

  // Create data table with configuration
  const dataTable = createProductsTable(API_BASE_URL);

  placeholder.appendChild(dataTable);
  await dataTable.init();

  // Operasyonları yükle
  await loadOperations();

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