// Template for other screens that need the common table functionality
// Bu template'i kopyalayıp kendi endpoint'lerinizi ve column'larınızı tanımlayın

import { createDataTable, showToast, showFormErrors, clearFormErrors } from '../ui/helpers.js';
let _cleanup = null;

export async function mount(container, { setHeader }) {
  // Sekme başlığını değiştirin
  setHeader('Sekmenim', 'Sekme açıklaması');

  container.innerHTML = `
    <div class="mt-2">
      <h3 class="text-xl font-semibold mb-2">Yeni Kayıt Ekle</h3>
      </br>
      <form id="data-form" class="space-y-4">
        <!-- Form alanlarınızı buraya ekleyin -->
        <div class="grid grid-cols-3 gap-4">
          <label class="flex flex-col text-sm">Alan 1<input name="field1" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
          <label class="flex flex-col text-sm">Alan 2<input name="field2" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" required /></label>
          <label class="flex flex-col text-sm">Alan 3<input name="field3" type="text" class="mt-1 px-3 py-2 bg-neutral-800 rounded text-neutral-100" /></label>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500">Kaydet</button>
          </br></br></br>
          <button type="button" id="reset-btn" class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">Temizle</button>
        </div>
      </form>

      <div id="data-list-placeholder"></div>
    </div>
  `;

  const form = container.querySelector('#data-form');
  const placeholder = container.querySelector('#data-list-placeholder');

  // API configuration - Kendi endpoint'lerinizi buraya yazın
  const API_BASE_URL = 'https://localhost:7287';

  async function submitHandler(e) {
    e.preventDefault();
    clearFormErrors(form);
    
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    // Form validasyonunuzu buraya ekleyin
    const errors = [];
    if (!data.field1) errors.push({ field: 'field1', msg: 'Alan 1 gerekli' });
    if (!data.field2) errors.push({ field: 'field2', msg: 'Alan 2 gerekli' });
    
    if (errors.length) { 
      showFormErrors(form, errors); 
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; 
    submitBtn.textContent = 'Kaydediliyor...';
    
    try {
      // API payload'unuzu buraya yazın
      const payload = {
        field1: data.field1,
        field2: data.field2,
        field3: data.field3
      };

      // Endpoint'inizi değiştirin
      const url = `${API_BASE_URL}/YourEndpoint/entry`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${responseText}`);
      }
      
      showToast('Kayıt başarıyla eklendi', 'success');
      form.reset();
      await dataTable.reload();
      
    } catch (err) {
      console.error('❌ CREATE ERROR:', err);
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
  container.querySelector('#reset-btn').addEventListener('click', resetHandler);

  // Create data table with configuration
  const dataTable = createDataTable({
    apiBaseUrl: API_BASE_URL,
    endpoints: {
      list: '/YourEndpoint',                          // GET listelemek için
      activate: '/YourEndpoint/{id}/activate',        // PATCH aktif yapmak için  
      deactivate: '/YourEndpoint/{id}/deactivate',    // PATCH pasif yapmak için
      update: '/YourEndpoint/{id}'                    // PUT güncellemek için
    },
    columns: [
      {
        field: 'field1',           // API'den gelen alan adı
        header: 'Alan 1',          // Tablo başlığında görünecek
        className: 'font-mono',    // CSS class (opsiyonel)
        editable: true             // Inline editing için
      },
      {
        field: 'field2',
        header: 'Alan 2',
        editable: true
      },
      {
        field: 'field3',
        header: 'Alan 3',
        editable: false            // Bu alan düzenlenemez
      },
      {
        field: 'customField',
        header: 'Özel Alan',
        render: (value, record) => {  // Özel render fonksiyonu
          return record.field1 + ' - ' + record.field2;
        }
      }
    ],
    searchFields: ['field1', 'field2', 'field3'],  // Arama yapılacak alanlar
    title: 'Tanımlı Kayıtlar',                     // Tablo başlığı
    validateRowData: (data) => {                   // Inline editing validasyonu
      const errors = [];
      if (!data.field1) errors.push('Alan 1 gerekli');
      if (!data.field2) errors.push('Alan 2 gerekli');
      return { isValid: errors.length === 0, errors };
    },
    formatPayload: (data) => ({                    // API'ye gönderilecek format
      field1: data.field1,
      field2: data.field2,
      field3: data.field3
    })
  });

  placeholder.appendChild(dataTable);
  await dataTable.init();

  _cleanup = () => {
    try { form.removeEventListener('submit', submitHandler); } catch(e){}
    try { const resetBtn = container.querySelector('#reset-btn'); if (resetBtn) resetBtn.removeEventListener('click', resetHandler); } catch(e){}
    try { container.innerHTML = ''; } catch(e){}
    _cleanup = null;
  };
}

export async function unmount(container) { 
  if (_cleanup) _cleanup(); 
}

/* 
KULLANIM KILAVUZU:

1. setHeader() - Sekme başlığınızı ve açıklamanızı değiştirin

2. HTML Form - Kendi form alanlarınızı ekleyin:
   - input name attribute'ları API payload ile eşleşmeli
   - required, type gibi validation attribute'ları ekleyin

3. API_BASE_URL - API base URL'inizi ayarlayın

4. submitHandler - Form submit mantığınızı yazın:
   - Validation errors dizisini kendi alanlarınıza göre düzenleyin
   - API payload'unu kendi formatınıza göre oluşturun
   - Endpoint URL'ini değiştirin (/YourEndpoint/entry)

5. createDataTable config:
   - endpoints: Kendi API endpoint'lerinizi yazın
   - columns: Tablo sütunlarınızı tanımlayın
   - searchFields: Arama yapılacak alanları belirleyin
   - title: Tablo başlığınızı yazın
   - validateRowData: Inline editing için validation logic
   - formatPayload: Update API'sine gönderilecek format

6. Her {id} kısmı otomatik olarak record ID ile değiştirilir

Bu template'i kullanarak tüm CRUD operasyonları olan sekmeleri kolayca oluşturabilirsiniz!
*/