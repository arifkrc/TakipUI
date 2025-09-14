import { createSimpleTable } from '../simple-table.js';
import ProductInputComponent from '../core/product-input.js';

// Sipariş tablosu konfigürasyonu
export function createOrdersTable(apiBaseUrl) {
  return createSimpleTable({
    apiBaseUrl,
    endpoints: {
      list: '/Orders',
      save: '/Orders', 
      update: '/Orders/{id}',
      delete: '/Orders/{id}',
      activate: '/Orders/{id}/activate',
      deactivate: '/Orders/{id}/deactivate'
    },
    columns: [
      {
        field: 'documentNo',
        header: 'Belge No',
        className: 'font-mono',
        editable: true
      },
      {
        field: 'customer',
        header: 'Müşteri',
        editable: true
      },
      {
        field: 'productCode',
        header: 'Ürün Kodu',
        className: 'font-mono',
        editable: true,
        customRender: (record) => {
          if (record.productCode) {
            const productInfo = record.productName ? 
              `${record.productCode} (${record.productName})` : 
              record.productCode;
            return `<span title="ID: ${record.productId || 'N/A'}">${productInfo}</span>`;
          }
          return record.productCode || '';
        }
      },
      {
        field: 'variants',
        header: 'Varyantlar',
        className: 'text-sm',
        editable: true
      },
      {
        field: 'orderCount',
        header: 'Sipariş Adet',
        className: 'text-center',
        editable: true
      },
      {
        field: 'completedQuantity',
        header: 'Tamamlanan',
        className: 'text-center',
        editable: true
      },
      {
        field: 'remaining',
        header: 'Kalan',
        className: 'text-center font-medium',
        editable: false,
        customRender: (record) => {
          const orderCount = parseInt(record.orderCount) || 0;
          const completedQuantity = parseInt(record.completedQuantity) || 0;
          const remaining = orderCount - completedQuantity;
          
          // Kalan miktar negatifse kırmızı, pozitifse yeşil, sıfırsa gri renk
          let colorClass = 'text-neutral-400';
          if (remaining > 0) {
            colorClass = 'text-green-400';
          } else if (remaining < 0) {
            colorClass = 'text-red-400';
          }
          
          return `<span class="${colorClass} font-mono">${remaining}</span>`;
        }
      },
      {
        field: 'carryover',
        header: 'Devir',
        className: 'text-center',
        editable: true
      },
      {
        field: 'orderAddedDateTime',
        header: 'Hafta',
        className: 'text-center font-mono',
        editable: true
      },
      {
        field: 'addedDateTime',
        header: 'Eklenme',
        className: 'text-neutral-400 text-xs',
        editable: false
      }
    ],
    searchFields: ['documentNo', 'customer', 'productCode', 'variants'],
    title: 'Sipariş Listesi',
    
    // Siparişe özel hücre render
    renderCell: (value, record, column) => {
      if (column.field === 'orderAddedDateTime') {
        // Hafta bilgisi için string render (örn: "37.HAFTA")
        return value ? `<span class="text-neutral-200 font-mono">${value}</span>` : '-';
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
            
            // Tarih formatı: DD.MM.YYYY HH:mm
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
      
      if (column.field === 'remaining') {
        // Kalan miktar hesaplama - bu custom render'da yapılıyor
        const orderCount = parseInt(record.orderCount) || 0;
        const completedQuantity = parseInt(record.completedQuantity) || 0;
        const remaining = orderCount - completedQuantity;
        
        // Renk kodlaması
        let colorClass = 'text-neutral-400';
        let bgClass = '';
        if (remaining > 0) {
          colorClass = 'text-green-400';
          bgClass = 'bg-green-900 bg-opacity-20';
        } else if (remaining < 0) {
          colorClass = 'text-red-400';
          bgClass = 'bg-red-900 bg-opacity-20';
        } else {
          bgClass = 'bg-neutral-800';
        }
        
        return `<span class="${colorClass} ${bgClass} px-2 py-1 rounded font-mono text-sm">${remaining}</span>`;
      }
      
      if (column.field === 'orderCount' || column.field === 'carryover' || column.field === 'completedQuantity') {
        return value !== null && value !== undefined ? value.toString() : '0';
      }
      
      if (column.field === 'variants') {
        if (value && value.length > 30) {
          return `<span title="${value}">${value.substring(0, 30)}...</span>`;
        }
        return value || '-';
      }
      
      return value || '-';
    },
    
    // Siparişe özel düzenleme kontrolü
    createEditInput: (value, record, column) => {
      if (column.field === 'documentNo') {
        return `<input type="text" value="${value || ''}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs font-mono" placeholder="DOC001">`;
      }
      
      if (column.field === 'customer') {
        return `<input type="text" value="${value || ''}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs" placeholder="Müşteri adı">`;
      }
      
      if (column.field === 'productCode') {
        const input = `<input type="text" value="${value || ''}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs font-mono uppercase" placeholder="PRD001">`;
        
        // Input oluşturulduktan sonra ProductInputComponent ile product lookup ekle
        setTimeout(() => {
          const inputElement = document.querySelector(`input[value="${value || ''}"]`);
          if (inputElement) {
            // Temporary ProductInputComponent instance for lookup
            const tempProductInput = new ProductInputComponent();
            
            inputElement.addEventListener('blur', async () => {
              const productCode = inputElement.value.trim().toUpperCase();
              if (productCode) {
                try {
                  const product = await tempProductInput.searchProduct(productCode);
                  if (product) {
                    const productName = product.name || product.productName || product.Name || product.ProductName || 'İsimsiz Ürün';
                    inputElement.title = `${productName} (ID: ${product.id || product.Id})`;
                    inputElement.style.borderColor = '#10b981'; // green
                  } else {
                    inputElement.title = 'Ürün bulunamadı';
                    inputElement.style.borderColor = '#ef4444'; // red
                  }
                } catch (error) {
                  console.error('Product lookup error:', error);
                  inputElement.title = 'Ürün arama hatası';
                  inputElement.style.borderColor = '#f59e0b'; // yellow
                }
              }
            });
          }
        }, 100);
        
        return input;
      }
      
      if (column.field === 'variants') {
        return `<textarea rows="2" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs" placeholder="Varyant bilgileri">${value || ''}</textarea>`;
      }
      
      if (column.field === 'orderCount' || column.field === 'carryover' || column.field === 'completedQuantity') {
        return `<input type="number" min="0" value="${value || 0}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs" placeholder="0">`;
      }
      
      if (column.field === 'orderAddedDateTime') {
        return `<input type="text" value="${value || ''}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs font-mono" placeholder="37.HAFTA">`;
      }
      
      return `<input type="text" value="${value || ''}" class="w-full px-2 py-1 bg-neutral-700 rounded text-xs">`;
    },
    
    // Siparişe özel validasyon
    validateRowData: (data) => {
      const errors = [];
      if (!data.documentNo) errors.push('Belge numarası gerekli');
      if (!data.customer) errors.push('Müşteri adı gerekli');
      if (!data.productCode) errors.push('Ürün kodu gerekli');
      if (!data.orderAddedDateTime) errors.push('Hafta bilgisi gerekli');
      if (data.orderCount !== undefined && data.orderCount < 0) errors.push('Sipariş adeti negatif olamaz');
      if (data.completedQuantity !== undefined && data.completedQuantity < 0) errors.push('Tamamlanan miktar negatif olamaz');
      if (data.carryover !== undefined && data.carryover < 0) errors.push('Devir negatif olamaz');
      
      return { isValid: errors.length === 0, errors };
    },
    
    // API'ye gönderilecek format
    formatPayload: (data) => {
      return {
        orderAddedDateTime: (data.orderAddedDateTime || '').trim(), // Hafta bilgisi
        documentNo: (data.documentNo || '').trim(),
        customer: (data.customer || '').trim(),
        productCode: (data.productCode || '').toUpperCase().trim(),
        variants: (data.variants || '').trim(),
        orderCount: parseInt(data.orderCount) || 0,
        completedQuantity: parseInt(data.completedQuantity) || 0,
        carryover: parseInt(data.carryover) || 0
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
        if (!updatedData.orderAddedDateTime) errors.push('Hafta bilgisi gerekli');
        if (!updatedData.documentNo) errors.push('Belge numarası gerekli');
        if (!updatedData.customer) errors.push('Müşteri adı gerekli');
        if (!updatedData.productCode) errors.push('Ürün kodu gerekli');
        
        // Ürün kodu kontrolü
        let productId = null;
        if (updatedData.productCode) {
          try {
            // Centralized ProductInputComponent kullan
            const tempProductInput = new ProductInputComponent();
            const product = await tempProductInput.searchProduct(updatedData.productCode);
            if (product) {
              productId = product.id || product.Id;
            } else {
              errors.push('Geçersiz ürün kodu');
            }
          } catch (error) {
            console.error('Product lookup error:', error);
            errors.push('Ürün doğrulama hatası');
          }
        }
        
        // Sayısal alanları kontrol et
        if (updatedData.orderCount && isNaN(parseInt(updatedData.orderCount))) {
          errors.push('Sipariş adeti sayı olmalı');
        }
        if (updatedData.completedQuantity && isNaN(parseInt(updatedData.completedQuantity))) {
          errors.push('Tamamlanan miktar sayı olmalı');
        }
        if (updatedData.carryover && isNaN(parseInt(updatedData.carryover))) {
          errors.push('Devir sayı olmalı');
        }
        
        if (errors.length > 0) {
          showToast(errors.join(', '), 'error');
          return false;
        }
        
        // API formatına çevir
        const payload = {
          orderAddedDateTime: updatedData.orderAddedDateTime, // Hafta bilgisi
          documentNo: updatedData.documentNo,
          customer: updatedData.customer,
          productCode: updatedData.productCode.toUpperCase(),
          productId: productId, // Ürün ID'sini ekle
          variants: updatedData.variants || '',
          orderCount: parseInt(updatedData.orderCount) || 0,
          completedQuantity: parseInt(updatedData.completedQuantity) || 0,
          carryover: parseInt(updatedData.carryover) || 0
        };
        
        // API'ye gönder
        const url = `${apiBaseUrl}/Orders/${id}`;
        console.log('🔄 ORDER UPDATE REQUEST');
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

        showToast('Sipariş başarıyla güncellendi', 'success');
        await loadData();
        return true;

      } catch (err) {
        console.error('❌ ORDER UPDATE ERROR:', err);
        showToast('Güncelleme hatası: ' + err.message, 'error');
        return false;
      }
    },

    // Özel tamamlanan miktar güncelleme handler'ı
    customCellClickHandler: async (record, column, cell, apiBaseUrl, showToast, loadData) => {
      // Sadece completedQuantity kolonu için özel işlem
      if (column.field !== 'completedQuantity') {
        return false; // Normal edit moduna geç
      }

      console.log('🎯 Special edit mode for completedQuantity:', record.id);

      // Mevcut değeri al
      const currentValue = parseInt(record.completedQuantity) || 0;
      const orderCount = parseInt(record.orderCount) || 0;

      // Inline input oluştur
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = orderCount.toString(); // Sipariş adetini maksimum olarak ayarla
      input.value = currentValue;
      input.className = 'w-full px-2 py-1 bg-neutral-600 rounded text-xs text-center border-2 border-blue-500';
      input.style.fontSize = '12px';
      input.title = `Maksimum: ${orderCount}`; // Tooltip ile bilgi ver

      // Hücre içeriğini değiştir
      const originalContent = cell.innerHTML;
      cell.innerHTML = '';
      cell.appendChild(input);
      input.focus();
      input.select();

      // Save function
      const saveValue = async () => {
        const newValue = parseInt(input.value) || 0;
        
        if (newValue === currentValue) {
          // Değişiklik yok, geri çevir
          cell.innerHTML = originalContent;
          return;
        }

        // Kullanıcı dostu validasyon
        if (newValue < 0) {
          showToast('Tamamlanan miktar sıfırdan küçük olamaz', 'warning');
          input.focus();
          return;
        }
        
        // Sipariş adeti kontrolü
        const orderCount = parseInt(record.orderCount) || 0;
        if (newValue > orderCount) {
          showToast(`Tamamlanan miktar sipariş adetinden (${orderCount}) fazla olamaz`, 'warning');
          input.focus();
          return;
        }

        try {
          // Loading state
          cell.innerHTML = '<span class="text-blue-400 text-xs">Güncelleniyor...</span>';

          // Özel PATCH endpoint'ini kullan
          const url = `${apiBaseUrl}/Orders/${record.id}/completed-quantity/${newValue}`;
          console.log('🔄 PATCH completedQuantity:', url);

          const response = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const result = await response.json();
          console.log('✅ PATCH SUCCESS:', result);

          showToast('Tamamlanan miktar güncellendi', 'success');
          
          // Eğer tamamlanan miktar arttıysa, Packings tablosuna da kayıt ekle
          if (newValue > currentValue) {
            const addedQuantity = newValue - currentValue;
            await addPackingRecord(record.productCode, addedQuantity, apiBaseUrl, showToast);
          }
          
          // Tabloyu yenile
          await loadData();

        } catch (error) {
          console.error('❌ PATCH ERROR:', error);
          
          // Kullanıcı dostu hata mesajları
          let userMessage = 'Güncelleme hatası';
          
          // HTTP 400 - Validation errors
          if (error.message.includes('400')) {
            if (error.message.includes('exceed order count') || error.message.includes('greater than order count')) {
              // Sipariş adetinden fazla tamamlanan girişi
              const orderCount = parseInt(record.orderCount) || 0;
              userMessage = `Tamamlanan miktar sipariş adetinden (${orderCount}) fazla olamaz`;
            } else if (error.message.includes('negative') || error.message.includes('minimum')) {
              // Negatif değer girişi
              userMessage = 'Tamamlanan miktar sıfırdan küçük olamaz';
            } else {
              // Diğer validation hataları
              userMessage = 'Geçersiz değer girdiniz';
            }
          }
          // HTTP 404 - Record not found
          else if (error.message.includes('404')) {
            userMessage = 'Sipariş bulunamadı, sayfa yenilenecek';
            setTimeout(() => loadData(), 1500); // Tabloyu yenile
          }
          // HTTP 500 - Server error
          else if (error.message.includes('500')) {
            userMessage = 'Sunucu hatası, lütfen tekrar deneyin';
          }
          // Network errors
          else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            userMessage = 'Bağlantı hatası, internet bağlantınızı kontrol edin';
          }
          // Diğer hatalar
          else {
            userMessage = 'Beklenmeyen hata oluştu';
          }
          
          showToast(userMessage, 'error');
          cell.innerHTML = originalContent;
        }
      };

      // Cancel function
      const cancelEdit = () => {
        cell.innerHTML = originalContent;
      };

      // Event listeners
      input.addEventListener('blur', saveValue);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveValue();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
      });

      return true; // Özel işlem yapıldı, normal edit moduna geçme
    }
  });
}

// Paketleme kaydı ekleme fonksiyonu
async function addPackingRecord(productCode, quantity, apiBaseUrl, showToast) {
  try {
    console.log('📦 Adding packing record:', { productCode, quantity });
    
    // Packings API payload
    const packingPayload = {
      shift: null,
      supervisor: null,
      productCode: productCode,
      quantity: quantity,
      explodedFrom: null,
      explodingTo: null
    };
    
    console.log('📤 Packing payload:', JSON.stringify(packingPayload, null, 2));
    
    // Packings endpoint'ine POST isteği
    const packingResponse = await fetch(`${apiBaseUrl}/Packings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packingPayload)
    });
    
    if (!packingResponse.ok) {
      const errorText = await packingResponse.text();
      throw new Error(`Packing kayıt hatası: HTTP ${packingResponse.status} - ${errorText}`);
    }
    
    const packingResult = await packingResponse.json();
    console.log('✅ Packing record added:', packingResult);
    
    // Kullanıcıya bilgi ver (opsiyonel - çok fazla toast olmasın diye kısa mesaj)
    showToast(`+${quantity} adet paketleme kaydı eklendi`, 'info');
    
  } catch (error) {
    console.error('❌ Packing record error:', error);
    // Paketleme kaydı başarısız olsa bile sipariş güncellemesi başarılı olduğu için error toast vermeyelim
    // Sadece console'da log tutalım
    console.warn('⚠️ Packing record could not be added, but order update was successful');
  }
}