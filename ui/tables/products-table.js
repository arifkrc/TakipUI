import { createSimpleTable } from '../simple-table.js';

// Ürün kodu ve tip eşleştirme sistemi
function getProductTypeFromCode(productCode) {
  if (!productCode || productCode.length < 3) return null;
  const thirdDigit = productCode.charAt(2);
  
  switch (thirdDigit) {
    case '1': return 'DİSK';
    case '2': return 'KAMPANA';
    case '4': return 'POYRA';
    default: return null;
  }
}

function validateProductCodeAndType(productCode, selectedType) {
  const expectedType = getProductTypeFromCode(productCode);
  
  if (!expectedType) {
    return {
      isValid: true,
      warning: `Ürün kodunun 3. hanesi (${productCode.charAt(2)}) standart sistem dışındadır. Kabul edilen değerler: 1=DİSK, 2=KAMPANA, 4=POYRA`
    };
  }
  
  if (expectedType !== selectedType) {
    return {
      isValid: false,
      expectedType,
      warning: `Ürün kodu "${productCode}" için beklenen tip "${expectedType}" ama "${selectedType}" seçildi. 3. hane "${productCode.charAt(2)}" = ${expectedType}`
    };
  }
  
  return { isValid: true };
}

// Operasyonları direkt API'den yükle (cache kullanmadan)
async function loadOperations(apiBaseUrl) {
  try {
    console.log('🔄 Loading operations from API (no cache)...');
    
    const url = `${apiBaseUrl}/operasyon?status=active`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const apiResponse = await response.json();
    const operations = Array.isArray(apiResponse) ? apiResponse : (apiResponse.data || []);
    
    console.log(`✅ Operations loaded directly: ${operations.length} items`);
    return operations;

  } catch (err) {
    console.error('❌ Operations loading error:', err);
    throw err;
  }
}

// Ürün tablosu konfigürasyonu
export function createProductsTable(apiBaseUrl) {
  return createSimpleTable({
    apiBaseUrl,
    endpoints: {
      list: '/Products',
      activate: '/Products/{id}/activate',
      deactivate: '/Products/{id}/deactivate',
      update: '/Products/{id}'
    },
    columns: [
      {
        field: 'productCode',
        header: 'Ürün Kodu',
        className: 'font-mono',
        editable: true
      },
      {
        field: 'name',
        header: 'Ürün Adı',
        editable: true
      },
      {
        field: 'type',
        header: 'Ürün Tipi',
        editable: true
      },
      {
        field: 'addedDateTime',
        header: 'Eklenme',
        className: 'text-neutral-400 text-xs',
        editable: false
      },
      {
        field: 'description',
        header: 'Açıklama',
        className: 'text-sm max-w-xs',
        editable: true
      },
      {
        field: 'lastOperationName',
        header: 'Son İşlem',
        className: 'text-neutral-400 text-xs',
        editable: true
      }
    ],
    searchFields: ['productCode', 'name', 'type', 'description', 'addedDateTime'],
    title: 'Tanımlı Ürünler',
    
    // Ürüne özel hücre render
    renderCell: (value, record, column) => {
      if (column.field === 'description') {
        if (value && value.length > 50) {
          return `<span title="${value}">${value.substring(0, 50)}...</span>`;
        }
        return value || '-';
      }
      
      if (column.field === 'lastOperationName') {
        if (record.lastOperationName) {
          return `${record.lastOperationName} (${record.lastOperationShortCode || ''})`;
        }
        return '-';
      }
      
      if (column.field === 'addedDateTime') {
        if (value) {
          try {
            const date = new Date(value);
            
            // Geçersiz tarih kontrolü
            if (isNaN(date.getTime())) {
              console.warn('Invalid date value:', value);
              return `<span class="text-neutral-500">${value}</span>`;
            }
            
            // Sadece tarih formatı: DD.MM.YYYY HH:mm
            const formatted = date.toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric'
            }) + ' ' + date.toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit'
            });
            
            return `<span class="text-neutral-400">${formatted}</span>`;
          } catch (err) {
            console.error('Date rendering error for value:', value, err);
            return `<span class="text-neutral-500" title="Tarih formatı hatası">${value}</span>`;
          }
        }
        return '-';
      }
      
      return value || '-';
    },
    
    // Ürüne özel düzenleme kontrolü
    createEditInput: (value, record, column) => {
      if (column.field === 'productCode') {
        return `<input type="text" value="${value || ''}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs font-mono uppercase" placeholder="PRD001">`;
      }
      
      if (column.field === 'name') {
        return `<textarea rows="2" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs" placeholder="Ürün adı">${value || ''}</textarea>`;
      }
      
      if (column.field === 'type') {
        const selected = value || '';
        return `
          <select class="w-full px-2 py-1 bg-neutral-700 rounded text-xs">
            <option value="">Seçiniz...</option>
            <option value="DİSK" ${selected === 'DİSK' ? 'selected' : ''}>DİSK</option>
            <option value="KAMPANA" ${selected === 'KAMPANA' ? 'selected' : ''}>KAMPANA</option>
            <option value="POYRA" ${selected === 'POYRA' ? 'selected' : ''}>POYRA</option>
          </select>
        `;
      }
      
      if (column.field === 'description') {
        return `<textarea rows="3" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs" placeholder="Ürün açıklaması">${value || ''}</textarea>`;
      }
      
      if (column.field === 'lastOperationName') {
        // Operasyon dropdown - async yükleme
        const selectElement = `<select class="w-full px-2 py-1 bg-neutral-700 rounded text-xs"><option value="">Yükleniyor...</option></select>`;
        
        // DOM'a eklendikten sonra operasyonları yükle
        setTimeout(async () => {
          const operations = await loadOperations(apiBaseUrl);
          const select = document.querySelector(`[data-field="${column.field}"] select`);
          if (select) {
            const currentValue = record.lastOperationId;
            let optionsHtml = '<option value="">Operasyon seçiniz...</option>';
            operations.forEach(op => {
              const selected = op.id == currentValue ? 'selected' : '';
              optionsHtml += `<option value="${op.id}" ${selected}>${op.name} (${op.shortCode})</option>`;
            });
            select.innerHTML = optionsHtml;
          }
        }, 100);
        
        return selectElement;
      }
      
      return `<input type="text" value="${value || ''}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs">`;
    },
    
    // Ürüne özel validasyon
    validateRowData: (data) => {
      const errors = [];
      if (!data.productCode) errors.push('Ürün kodu gerekli');
      if (!data.name) errors.push('Ürün adı gerekli');
      if (!data.type) errors.push('Ürün tipi gerekli');
      
      // Ürün kodu ve tip uyumluluğunu kontrol et
      if (data.productCode && data.type) {
        const validation = validateProductCodeAndType(data.productCode, data.type);
        if (!validation.isValid) {
          errors.push(`Kod-tip uyumsuzluğu: Beklenen "${validation.expectedType}", Girilen "${data.type}"`);
        } else if (validation.warning) {
          errors.push(`Uyarı: ${validation.warning}`);
        }
      }
      
      return { isValid: errors.length === 0, errors };
    },
    
    // API'ye gönderilecek format
    formatPayload: (data) => {
      // lastOperationName seçilmişse lastOperationId'ye dönüştür
      let lastOperationId = null;
      
      // Eğer lastOperationName bir ID ise (select'ten gelen değer)
      if (data.lastOperationName && !isNaN(data.lastOperationName)) {
        lastOperationId = parseInt(data.lastOperationName);
      }
      // Eğer mevcut record'da lastOperationId varsa onu koru
      else if (data.lastOperationId) {
        lastOperationId = data.lastOperationId;
      }
      
      return {
        productCode: (data.productCode || '').toUpperCase().trim(),
        name: (data.name || '').trim(),
        type: (data.type || '').trim(),
        description: (data.description || '').trim(),
        lastOperationId: lastOperationId
      };
    },
    
    // Özel güncelleme işlemi
    customUpdateHandler: async (id, formData, record, apiBaseUrl, showToast, loadData) => {
      try {
        // Form verilerini topla
        const updatedData = {};
        Object.keys(formData).forEach(field => {
          const input = formData[field];
          updatedData[field] = input.value.trim();
        });
        
        // Özel validasyon
        const errors = [];
        if (!updatedData.productCode) errors.push('Ürün kodu gerekli');
        if (!updatedData.name) errors.push('Ürün adı gerekli');
        if (!updatedData.type) errors.push('Ürün tipi gerekli');
        
        // Ürün kodu format kontrolü
        if (updatedData.productCode) {
          updatedData.productCode = updatedData.productCode.toUpperCase();
          if (updatedData.productCode.length < 3) {
            errors.push('Ürün kodu en az 3 karakter olmalı');
          }
        }
        
        // Kod-tip uyumluluk kontrolü
        if (updatedData.productCode && updatedData.type) {
          const validation = validateProductCodeAndType(updatedData.productCode, updatedData.type);
          if (!validation.isValid) {
            // Uyarı göster ama devam et
            showToast(`⚠️ UYARI: Kod-tip uyumsuzluğu: Beklenen "${validation.expectedType}", Girilen "${updatedData.type}" - Güncelleme devam ediyor...`, 'warning');
          } else if (validation.warning) {
            showToast(`⚠️ UYARI: ${validation.warning} - Güncelleme devam ediyor...`, 'warning');
          }
        }
        
        if (errors.length > 0) {
          showToast(errors.join(', '), 'error');
          return false;
        }
        
        // API formatına çevir
        let lastOperationId = null;
        if (updatedData.lastOperationName && !isNaN(updatedData.lastOperationName)) {
          lastOperationId = parseInt(updatedData.lastOperationName);
        } else if (record.lastOperationId) {
          lastOperationId = record.lastOperationId;
        }
        
        const payload = {
          productCode: updatedData.productCode,
          name: updatedData.name,
          type: updatedData.type,
          description: updatedData.description || '',
          lastOperationId: lastOperationId
        };
        
        // API'ye gönder
        const url = `${apiBaseUrl}/Products/${id}`;
        console.log('🔄 PRODUCT UPDATE REQUEST');
        console.log('🔗 PUT URL:', url);
        console.log('📤 PUT PAYLOAD:', JSON.stringify(payload, null, 2));
        
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        console.log('📥 PUT RESPONSE STATUS:', response.status, response.statusText);

        if (!response.ok) {
          const responseText = await response.text();
          console.log('❌ PUT RESPONSE ERROR BODY:', responseText);
          throw new Error(`HTTP ${response.status} ${response.statusText} - ${responseText}`);
        }

        const responseData = await response.json();
        console.log('✅ PUT SUCCESS RESPONSE:', responseData);

        showToast('Ürün başarıyla güncellendi', 'success');
        await loadData();
        return true;

      } catch (err) {
        console.error('❌ PRODUCT UPDATE ERROR:', err);
        showToast('Güncelleme hatası: ' + err.message, 'error');
        return false;
      }
    }
  });
}

// Validation fonksiyonlarını export et (form için kullanılacak)
export { getProductTypeFromCode, validateProductCodeAndType };