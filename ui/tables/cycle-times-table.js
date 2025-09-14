import { createSimpleTable } from '../simple-table.js';

// Çevrim Zamanları tablosu konfigürasyonu
export function createCycleTimesTable(apiBaseUrl) {
  return createSimpleTable({
    apiBaseUrl,
    endpoints: {
      list: '/CycleTimes',
      activate: '/CycleTimes/{id}/activate',
      deactivate: '/CycleTimes/{id}/deactivate',
      update: '/CycleTimes/{id}'
    },
    columns: [
      {
        field: 'operationShortCode',
        header: 'Operasyon Kodu',
        className: 'font-mono',
        editable: false
      },
      {
        field: 'operationName',
        header: 'Operasyon Adı',
        editable: true
      },
      {
        field: 'productCode',
        header: 'Ürün Kodu',
        className: 'font-mono',
        editable: false
      },
      {
        field: 'productName',
        header: 'Ürün Adı',
        editable: false
      },
      {
        field: 'second',
        header: 'Süre (Saniye)',
        className: 'text-right font-mono',
        editable: true
      },
      {
        field: 'addedDateTime',
        header: 'Eklenme',
        className: 'text-neutral-400 text-xs',
        editable: false
      }
    ],
    searchFields: ['operationShortCode', 'operationName', 'productCode', 'productName', 'second'],
    title: 'Çevrim Zamanları',
    
    // Çevrim zamanlarına özel hücre render
    renderCell: (value, record, column) => {
      if (column.field === 'second') {
        // Saniyeyi dakika:saniye formatında göster
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        const timeDisplay = minutes > 0 
          ? `${minutes}:${seconds.toString().padStart(2, '0')}` 
          : `${seconds}s`;
        return `<span class="font-mono">${value}s</span> <span class="text-neutral-400 text-xs">(${timeDisplay})</span>`;
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
            
            return `<span class="text-neutral-400 text-xs">${formatted}</span>`;
          } catch (error) {
            console.error('Date formatting error:', error, 'for value:', value);
            return `<span class="text-neutral-500">${value}</span>`;
          }
        }
        return '<span class="text-neutral-500">-</span>';
      }
      
      return value || '-';
    },
    
    // Düzenleme için özel input oluşturma
    createEditInput: (value, record, column) => {
      if (column.field === 'second') {
        return `<input type="number" value="${value || ''}" min="1" max="86400" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs text-right font-mono" placeholder="Saniye">`;
      }
      
      if (column.field === 'operationName') {
        // Operasyon dropdown'u için placeholder - gerçek options runtime'da yüklenecek
        return `<select class="w-full px-2 py-1 bg-neutral-700 rounded text-xs operation-select" data-current-operation-id="${record.operationId || ''}" data-current-operation-name="${record.operationName || ''}">
          <option value="">Operasyon seçiniz...</option>
        </select>`;
      }
      
      return `<input type="text" value="${value || ''}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs">`;
    },
    
    // Row data validation
    validateRowData: (data) => {
      const errors = [];
      
      if (!data.second || data.second <= 0) {
        errors.push({ field: 'second', msg: 'Çevrim süresi pozitif bir sayı olmalıdır' });
      } else if (data.second > 86400) { // 24 saat = 86400 saniye
        errors.push({ field: 'second', msg: 'Çevrim süresi 24 saati geçemez' });
      }
      
      return {
        isValid: errors.length === 0,
        errors: errors
      };
    },
    
    // Çevrim zamanları için özel validasyon (deprecated - validateRowData kullanılacak)
    validateRecord: (data) => {
      const errors = [];
      
      if (!data.operationId || data.operationId <= 0) {
        errors.push({ field: 'operationId', msg: 'Operasyon seçimi zorunludur' });
      }
      
      if (!data.productCode || data.productCode.trim().length < 3) {
        errors.push({ field: 'productCode', msg: 'Ürün kodu en az 3 karakter olmalıdır' });
      }
      
      if (!data.second || data.second <= 0) {
        errors.push({ field: 'second', msg: 'Çevrim süresi pozitif bir sayı olmalıdır' });
      } else if (data.second > 86400) { // 24 saat = 86400 saniye
        errors.push({ field: 'second', msg: 'Çevrim süresi 24 saati geçemez' });
      }
      
      return errors;
    },
    
    // Düzenleme modalında özel alanlar
    getEditFields: () => [
      {
        name: 'operationId',
        label: 'Operasyon',
        type: 'select',
        required: true,
        options: [], // Runtime'da doldurulacak
        optionsLoader: async () => {
          try {
            const response = await fetch(`${apiBaseUrl}/Operations`);
            const result = await response.json();
            if (result.success && result.data) {
              return result.data.map(op => ({
                value: op.id,
                label: `${op.shortCode} - ${op.name}`
              }));
            }
          } catch (error) {
            console.error('Operations load error:', error);
          }
          return [];
        }
      },
      {
        name: 'productCode',
        label: 'Ürün Kodu',
        type: 'text',
        required: true,
        placeholder: 'Ürün kodunu girin'
      },
      {
        name: 'second',
        label: 'Çevrim Süresi (Saniye)',
        type: 'number',
        required: true,
        min: 1,
        max: 86400,
        placeholder: 'Saniye cinsinden girin'
      }
    ],
    
    // Özel güncelleme handler'ı
    customUpdateHandler: async (recordId, editableFields, originalRecord, apiBaseUrl, showToast, reloadData) => {
      try {
        // Düzenlenebilir alanlardan veri al
        const newData = {};
        let operationId = originalRecord.operationId; // Varsayılan
        
        // Operasyon seçimi kontrolü
        const operationSelect = editableFields.operationName;
        if (operationSelect && operationSelect.tagName === 'SELECT') {
          // Önce operasyon listesini yükle
          await loadOperationsToSelect(operationSelect, apiBaseUrl);
          
          const selectedOperationId = parseInt(operationSelect.value);
          if (selectedOperationId && selectedOperationId > 0) {
            operationId = selectedOperationId;
          }
        }
        
        // Second field
        if (editableFields.second) {
          const secondValue = parseInt(editableFields.second.value);
          if (secondValue && secondValue > 0) {
            newData.second = secondValue;
          }
        }
        
        // API payload (belirtilen format)
        const payload = {
          operationId: operationId,
          productId: originalRecord.productId || 1, // Mevcut productId'yi koru
          second: newData.second || originalRecord.second
        };
        
        console.log('🔄 CycleTimes UPDATE REQUEST');
        console.log('🔗 PUT URL:', `${apiBaseUrl}/CycleTimes/${recordId}`);
        console.log('📤 PUT PAYLOAD:', JSON.stringify(payload, null, 2));
        
        const response = await fetch(`${apiBaseUrl}/CycleTimes/${recordId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ CycleTimes UPDATE SUCCESS:', result);
        
        showToast('Çevrim zamanı başarıyla güncellendi', 'success');
        await reloadData(); // Tabloyu yenile
        
        return true;
        
      } catch (error) {
        console.error('❌ CycleTimes UPDATE ERROR:', error);
        showToast('Güncelleme hatası: ' + error.message, 'error');
        return false;
      }
    }
  });
  
  // Operasyon listesini dropdown'a yükle
  async function loadOperationsToSelect(selectElement, apiBaseUrl) {
    try {
      const response = await fetch(`${apiBaseUrl}/Operations`);
      const result = await response.json();
      
      let operations = [];
      if (Array.isArray(result)) {
        operations = result;
      } else if (result.success && result.data) {
        operations = result.data;
      } else if (result.data) {
        operations = result.data;
      }
      
      // Mevcut seçimi koru
      const currentOperationId = selectElement.getAttribute('data-current-operation-id');
      const currentOperationName = selectElement.getAttribute('data-current-operation-name');
      
      selectElement.innerHTML = '<option value="">Operasyon seçiniz...</option>';
      
      operations.forEach(op => {
        const option = document.createElement('option');
        option.value = op.id;
        option.textContent = `${op.shortCode} - ${op.name}`;
        
        // Mevcut operasyonu seçili yap
        if (op.id == currentOperationId) {
          option.selected = true;
        }
        
        selectElement.appendChild(option);
      });
      
      // Eğer mevcut operasyon listede yoksa, onu da ekle
      if (currentOperationId && currentOperationName && !operations.find(op => op.id == currentOperationId)) {
        const currentOption = document.createElement('option');
        currentOption.value = currentOperationId;
        currentOption.textContent = currentOperationName;
        currentOption.selected = true;
        selectElement.appendChild(currentOption);
      }
      
    } catch (error) {
      console.error('Operations load error:', error);
      selectElement.innerHTML = '<option value="">Operasyon yüklenemedi</option>';
    }
  }
}