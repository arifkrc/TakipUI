// Ortak utility fonksiyonlarını import et
import { showToast, showFormErrors, clearFormErrors } from './common-utils.js';

// Re-export for backward compatibility
export { showToast, showFormErrors, clearFormErrors };

// Enhanced async API wrapper with error handling
export async function safeApiCall(apiMethod, ...args) {
  try {
    const result = await apiMethod(...args);
    return result;
  } catch (err) {
    console.error('API call failed:', err);
    showToast(`Ä°ÅŸlem baÅŸarÄ±sÄ±z: ${err.message || 'Bilinmeyen hata'}`, 'error');
    return { ok: false, error: err.message || String(err) };
  }
}

// Enhanced delete with confirmation
export async function safeDelete(deleteMethod, itemId, itemName = 'kayÄ±t') {
  try {
    showToast(`${itemName} siliniyor...`, 'warning');
    
    const result = await deleteMethod(itemId);
    if (result && result.ok && result.removed) {
      showToast(`${itemName} silindi`, 'success');
      return true;
    } else {
      showToast(`${itemName} silinemedi`, 'error');
      return false;
    }
  } catch (err) {
    console.error('Delete operation failed:', err);
    showToast(`Silme hatasÄ±: ${err.message || 'Bilinmeyen hata'}`, 'error');
    return false;
  }
}

export function createRowCountSelector(initial = 20) {
  const wrapper = document.createElement('div');
  wrapper.className = 'mb-2 flex items-center gap-2';
  const label = document.createElement('label');
  label.className = 'text-sm text-neutral-400';
  label.textContent = 'SatÄ±r:';
  const select = document.createElement('select');
  select.className = 'px-2 py-1 bg-neutral-800 rounded text-neutral-100';
  const options = [5,10,15,20,50,100,'All'];

  // prefer saved preference if available
  let saved = null;
  try { saved = localStorage.getItem('rowCountPref'); } catch(e) { saved = null; }
  const initialValue = saved || (initial === 'All' ? 'all' : String(initial));

  options.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o === 'All' ? 'all' : String(o);
    opt.textContent = o === 'All' ? 'All' : String(o);
    if (opt.value === String(initialValue)) opt.selected = true;
    select.appendChild(opt);
  });

  // persist on change
  select.addEventListener('change', () => {
    try { localStorage.setItem('rowCountPref', select.value); } catch(e) { /* ignore */ }
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);
  return { wrapper, select };
}

export function createPaginationControls(totalItems = 0, pageSize = 20, currentPage = 1, onPage = () => {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'mt-2 flex items-center gap-2';

  const prev = document.createElement('button');
  prev.className = 'px-2 py-1 bg-neutral-800 rounded text-neutral-200 disabled:opacity-50';
  prev.textContent = '<';

  const pages = document.createElement('div');
  pages.className = 'flex items-center gap-1';

  const info = document.createElement('div');
  info.className = 'text-sm text-neutral-400 ml-2';

  const next = document.createElement('button');
  next.className = 'px-2 py-1 bg-neutral-800 rounded text-neutral-200 disabled:opacity-50';
  next.textContent = '>';

  let totalPages = Math.max(1, Math.ceil((totalItems || 0) / (pageSize || 1)));
  let current = Math.min(Math.max(1, Number(currentPage || 1)), totalPages);

  function buildPages() {
    pages.innerHTML = '';
    // show up to 7 page buttons centered on current
    const maxButtons = 7;
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
    for (let p = start; p <= end; p++) {
      const b = document.createElement('button');
      b.className = `px-2 py-1 rounded ${p===current ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-200'}`;
      b.textContent = String(p);
      b.addEventListener('click', () => { if (p !== current) { current = p; onPage(current); render(); } });
      pages.appendChild(b);
    }
  }

  function render() {
    totalPages = Math.max(1, Math.ceil((totalItems || 0) / (pageSize || 1)));
    current = Math.min(Math.max(1, Number(current || 1)), totalPages);
    prev.disabled = current <= 1;
    next.disabled = current >= totalPages;
    info.textContent = `Sayfa ${current} / ${totalPages} (Toplam ${totalItems})`;
    buildPages();
  }

  prev.addEventListener('click', () => { if (current > 1) { current -= 1; onPage(current); render(); } });
  next.addEventListener('click', () => { if (current < totalPages) { current += 1; onPage(current); render(); } });

  wrapper.appendChild(prev);
  wrapper.appendChild(pages);
  wrapper.appendChild(info);
  wrapper.appendChild(next);

  // expose update method to refresh total/pageSize/current
  wrapper.update = (newTotal = totalItems, newPageSize = pageSize, newCurrent = 1) => {
    totalItems = Number(newTotal || 0);
    pageSize = Number(newPageSize || 20) || 20;
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    current = Math.min(Math.max(1, Number(newCurrent || 1)), totalPages);
    render();
  };

  // initial render
  wrapper.update(totalItems, pageSize, currentPage);
  return wrapper;
}

// Common staging controls for batch operations
export function createStagingControls(type, options = {}) {
  const {
    onAddLocal = () => {},
    onUploadAll = () => {},
    onClearAll = () => {},
    refreshCallback = () => {}
  } = options;

  const wrapper = document.createElement('div');
  wrapper.className = 'mb-4 p-3 bg-neutral-800 rounded flex items-center justify-between gap-4';
  
  const leftSide = document.createElement('div');
  leftSide.className = 'flex items-center gap-3';
  
  const addLocalBtn = document.createElement('button');
  addLocalBtn.className = 'px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm';
  addLocalBtn.textContent = 'Local\'e Ekle (CSV)';
  
  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'px-3 py-2 rounded bg-green-600 hover:bg-green-500 text-sm';
  uploadBtn.textContent = 'TÃ¼mÃ¼nÃ¼ DB\'ye Aktar';
  
  const clearBtn = document.createElement('button');
  clearBtn.className = 'px-2 py-2 rounded bg-neutral-600 hover:bg-neutral-500 text-sm';
  clearBtn.textContent = 'Temizle';
  
  const rightSide = document.createElement('div');
  rightSide.className = 'text-sm text-neutral-400';
  
  const statusSpan = document.createElement('span');
  statusSpan.textContent = 'Local kayÄ±tlar: 0';
  
  leftSide.appendChild(addLocalBtn);
  leftSide.appendChild(uploadBtn);
  leftSide.appendChild(clearBtn);
  rightSide.appendChild(statusSpan);
  wrapper.appendChild(leftSide);
  wrapper.appendChild(rightSide);
  
  // Event handlers with error handling
  addLocalBtn.addEventListener('click', async () => {
    try {
      await onAddLocal();
      await refreshStatus();
    } catch (err) {
      console.error('Add local error:', err);
      showToast('Local ekleme hatasÄ±', 'error');
    }
  });
  
  uploadBtn.addEventListener('click', async () => {
    try {
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'AktarÄ±lÄ±yor...';
      const result = await onUploadAll();
      await refreshStatus();
      if (result && result.ok) {
        showToast(`${result.uploaded || 0} kayÄ±t aktarÄ±ldÄ±`, 'success');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('AktarÄ±m hatasÄ±', 'error');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'TÃ¼mÃ¼nÃ¼ DB\'ye Aktar';
    }
  });
  
  clearBtn.addEventListener('click', async () => {
    try {
      showToast('Local kayÄ±tlar temizleniyor...', 'warning');
      await onClearAll();
      await refreshStatus();
      showToast('Local kayÄ±tlar temizlendi', 'success');
    } catch (err) {
      console.error('Clear error:', err);
      showToast('Temizleme hatasÄ±', 'error');
    }
  });
  
  async function refreshStatus() {
    try {
      const staged = await window.api.stagingList(type);
      statusSpan.textContent = `Local kayÄ±tlar: ${staged.length}`;
      await refreshCallback();
    } catch (err) {
      console.error('Refresh status error:', err);
      statusSpan.textContent = 'Local kayÄ±tlar: --';
    }
  }
  
  // Initial status
  refreshStatus();
  
  // Expose methods
  wrapper.refreshStatus = refreshStatus;
  wrapper.getButtons = () => ({ addLocalBtn, uploadBtn, clearBtn });
  
  return wrapper;
}

// Common table utilities

// Time input helper for 24-hour format
export function setupTimeInput(input) {
  if (!input) return;
  
  // Format time input as user types
  input.addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^\d]/g, ''); // Only digits
    
    if (value.length >= 2) {
      value = value.substring(0, 2) + ':' + value.substring(2, 4);
    }
    
    e.target.value = value;
  });
  
  // Validate on blur
  input.addEventListener('blur', function(e) {
    const value = e.target.value;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (value && !timeRegex.test(value)) {
      e.target.setCustomValidity('GeÃ§erli saat formatÄ± girin (Ã–R: 08:30)');
      e.target.reportValidity();
    } else {
      e.target.setCustomValidity('');
    }
  });
  
  // Clear validation on focus
  input.addEventListener('focus', function(e) {
    e.target.setCustomValidity('');
  });
}

// Setup all time inputs in a container
export function setupTimeInputs(container) {
  const timeInputs = container.querySelectorAll('input[pattern="[0-9]{2}:[0-9]{2}"]');
  timeInputs.forEach(setupTimeInput);
}

