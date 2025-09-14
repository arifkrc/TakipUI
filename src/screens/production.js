/**
 * Modern Production Screen Component
 * Professional implementation using new architecture
 */

import { FormComponent } from '../components/Component.js';
import { ProductionService } from '../services/api-service.js';
import { showToast, showError } from '../components/Toast.js';
import { withErrorHandling } from '../utils/error-handler.js';
import { config } from '../config/config.js';

class ProductionScreen extends FormComponent {
  constructor(container, options = {}) {
    super(container, options);
    this.data = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.searchQuery = '';
    this.pageSize = config.get('ui.pageSize', 20);
  }

  getDefaultOptions() {
    return {
      autoRefresh: true,
      refreshInterval: 30000, // 30 seconds
      enableExport: true,
      enableSearch: true
    };
  }

  getInitialState() {
    return {
      loading: false,
      error: null,
      data: [],
      currentPage: 1,
      searchQuery: '',
      sortField: null,
      sortDirection: 'desc'
    };
  }

  /**
   * Component lifecycle: before mount
   */
  async beforeMount() {
    // Setup validation rules
    this.validationRules = {
      tarih: [
        (value) => value ? true : 'Tarih gereklidir',
        (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? true : 'Geçerli tarih formatı: YYYY-MM-DD'
      ],
      vardiya: [
        (value) => value ? true : 'Vardiya gereklidir'
      ],
      ustabasi: [
        (value) => value ? true : 'Ustabası gereklidir'
      ],
      urunKodu: [
        (value) => value ? true : 'Ürün kodu gereklidir'
      ]
    };
  }

  /**
   * Render component HTML
   */
  render() {
    this.container.innerHTML = `
      <div class="production-screen">
        <div class="screen-header mb-4">
          <h2 class="text-2xl font-bold text-white">Üretim Takip</h2>
          <p class="text-neutral-400">Üretim kayıtlarını yönetin</p>
        </div>

        <div class="production-form-section mb-6">
          <div class="bg-neutral-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-white">Yeni Üretim Kaydı</h3>
            
            <form id="production-form" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="form-field">
                <label class="block text-sm font-medium text-neutral-300 mb-2">Tarih</label>
                <input 
                  type="date" 
                  name="tarih" 
                  class="form-input w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white"
                  required
                />
              </div>

              <div class="form-field">
                <label class="block text-sm font-medium text-neutral-300 mb-2">Vardiya</label>
                <select 
                  name="vardiya" 
                  class="form-input w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white"
                  required
                >
                  <option value="">Seçiniz...</option>
                  <option value="1">1. Vardiya</option>
                  <option value="2">2. Vardiya</option>
                  <option value="3">3. Vardiya</option>
                </select>
              </div>

              <div class="form-field">
                <label class="block text-sm font-medium text-neutral-300 mb-2">Ustabası</label>
                <input 
                  type="text" 
                  name="ustabasi" 
                  class="form-input w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white"
                  required
                />
              </div>

              <div class="form-field">
                <label class="block text-sm font-medium text-neutral-300 mb-2">Ürün Kodu</label>
                <input 
                  type="text" 
                  name="urunKodu" 
                  class="form-input w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white"
                  required
                />
              </div>

              <div class="form-field">
                <label class="block text-sm font-medium text-neutral-300 mb-2">Açıklama</label>
                <input 
                  type="text" 
                  name="aciklama" 
                  class="form-input w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white"
                />
              </div>

              <div class="form-field">
                <label class="block text-sm font-medium text-neutral-300 mb-2">Makine/Hat</label>
                <input 
                  type="text" 
                  name="makineHat" 
                  class="form-input w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white"
                />
              </div>

              <div class="form-field">
                <label class="block text-sm font-medium text-neutral-300 mb-2">Üretilen Adet</label>
                <input 
                  type="number" 
                  name="uretilenAdet" 
                  min="0" 
                  class="form-input w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white"
                />
              </div>

              <div class="form-field">
                <label class="block text-sm font-medium text-neutral-300 mb-2">Fire Adet</label>
                <input 
                  type="number" 
                  name="fireAdet" 
                  min="0" 
                  class="form-input w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white"
                />
              </div>

              <div class="form-field">
                <label class="block text-sm font-medium text-neutral-300 mb-2">Müşteri</label>
                <input 
                  type="text" 
                  name="musteri" 
                  class="form-input w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white"
                />
              </div>

              <div class="form-actions md:col-span-2 lg:col-span-3 flex gap-3 mt-4">
                <button 
                  type="submit" 
                  class="btn btn-primary px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
                >
                  Kaydet
                </button>
                <button 
                  type="button" 
                  id="reset-form" 
                  class="btn btn-secondary px-6 py-2 bg-neutral-600 hover:bg-neutral-500 text-white rounded transition-colors"
                >
                  Temizle
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="production-list-section">
          <div class="bg-neutral-800 rounded-lg p-6">
            <div class="section-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h3 class="text-lg font-semibold text-white">Üretim Kayıtları</h3>
              
              <div class="flex flex-col sm:flex-row gap-3">
                <div class="search-container">
                  <input 
                    type="search" 
                    id="search-input" 
                    placeholder="Kayıtlarda ara..." 
                    class="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white w-full sm:w-64"
                  />
                </div>
                
                <div class="page-size-container">
                  <select 
                    id="page-size-select" 
                    class="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white"
                  >
                    <option value="10">10 kayıt</option>
                    <option value="20" selected>20 kayıt</option>
                    <option value="50">50 kayıt</option>
                    <option value="100">100 kayıt</option>
                  </select>
                </div>
                
                <button 
                  id="refresh-btn" 
                  class="btn btn-secondary px-4 py-2 bg-neutral-600 hover:bg-neutral-500 text-white rounded transition-colors"
                >
                  🔄 Yenile
                </button>
              </div>
            </div>

            <div id="loading-indicator" class="text-center py-8 hidden">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <p class="text-neutral-400 mt-2">Yükleniyor...</p>
            </div>

            <div id="error-message" class="bg-red-900/20 border border-red-500 rounded p-4 mb-4 hidden">
              <p class="text-red-400"></p>
            </div>

            <div id="production-table-container">
              <!-- Table will be rendered here -->
            </div>

            <div id="pagination-container" class="mt-4">
              <!-- Pagination will be rendered here -->
            </div>
          </div>
        </div>
      </div>
    `;

    // Create references
    this.createRef('form', '#production-form');
    this.createRef('searchInput', '#search-input');
    this.createRef('pageSizeSelect', '#page-size-select');
    this.createRef('refreshBtn', '#refresh-btn');
    this.createRef('loadingIndicator', '#loading-indicator');
    this.createRef('errorMessage', '#error-message');
    this.createRef('tableContainer', '#production-table-container');
    this.createRef('paginationContainer', '#pagination-container');

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    this.find('[name="tarih"]').value = today;
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Form submission
    this.addEventListener(this.getRef('form'), 'submit', this.handleFormSubmit.bind(this));
    
    // Form reset
    this.addEventListener(this.find('#reset-form'), 'click', this.handleFormReset.bind(this));
    
    // Search
    this.addEventListener(this.getRef('searchInput'), 'input', 
      this.debounce(this.handleSearch.bind(this), 300)
    );
    
    // Page size change
    this.addEventListener(this.getRef('pageSizeSelect'), 'change', this.handlePageSizeChange.bind(this));
    
    // Refresh button
    this.addEventListener(this.getRef('refreshBtn'), 'click', this.loadData.bind(this));
  }

  /**
   * Component lifecycle: after mount
   */
  async afterMount() {
    await this.loadData();
    
    // Setup auto-refresh if enabled
    if (this.getOption('autoRefresh')) {
      this.setupAutoRefresh();
    }
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    e.preventDefault();
    
    try {
      // Get form data
      const formData = this.getFormData();
      
      // Validate form
      if (!this.validate(formData)) {
        this.showErrors();
        return;
      }
      
      // Clear any previous errors
      this.clearErrors();
      
      // Show loading state
      const submitBtn = this.find('[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Kaydediliyor...';
      
      // Save data
      const result = await ProductionService.save(formData);
      
      if (result.ok) {
        showToast('Üretim kaydı başarıyla eklendi', 'success');
        this.resetForm();
        await this.loadData();
      } else {
        showError(result.error || 'Kaydetme işlemi başarısız');
      }
      
    } catch (error) {
      showError('Kaydetme sırasında hata oluştu');
    } finally {
      // Reset button state
      const submitBtn = this.find('[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kaydet';
    }
  }

  /**
   * Handle form reset
   */
  handleFormReset() {
    this.resetForm();
    const today = new Date().toISOString().split('T')[0];
    this.find('[name="tarih"]').value = today;
  }

  /**
   * Handle search
   */
  handleSearch(e) {
    this.searchQuery = e.target.value.toLowerCase();
    this.filterAndPaginate();
  }

  /**
   * Handle page size change
   */
  handlePageSizeChange(e) {
    this.pageSize = parseInt(e.target.value);
    this.currentPage = 1;
    this.filterAndPaginate();
  }

  /**
   * Load production data
   */
  async loadData() {
    try {
      this.setState({ loading: true, error: null });
      this.showLoading();
      
      const result = await ProductionService.list();
      
      if (result.ok) {
        this.data = result.records || [];
        this.setState({ data: this.data });
        this.filterAndPaginate();
      } else {
        throw new Error(result.error || 'Veri yüklenemedi');
      }
      
    } catch (error) {
      this.setState({ error: error.message });
      this.showError(error.message);
    } finally {
      this.setState({ loading: false });
      this.hideLoading();
    }
  }

  /**
   * Filter and paginate data
   */
  filterAndPaginate() {
    // Filter data
    if (this.searchQuery) {
      this.filteredData = this.data.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(this.searchQuery)
        )
      );
    } else {
      this.filteredData = [...this.data];
    }
    
    // Sort data (newest first)
    this.filteredData.sort((a, b) => {
      return new Date(b.savedAt || 0) - new Date(a.savedAt || 0);
    });
    
    this.renderTable();
    this.renderPagination();
  }

  /**
   * Render data table
   */
  renderTable() {
    const container = this.getRef('tableContainer');
    
    if (this.filteredData.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-neutral-400">
          ${this.searchQuery ? 'Arama kriterine uygun kayıt bulunamadı' : 'Henüz üretim kaydı bulunmuyor'}
        </div>
      `;
      return;
    }
    
    // Calculate pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const pageData = this.filteredData.slice(startIndex, endIndex);
    
    const tableHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-neutral-700">
              <th class="text-left p-3 text-neutral-300">İşlemler</th>
              <th class="text-left p-3 text-neutral-300">Tarih</th>
              <th class="text-left p-3 text-neutral-300">Vardiya</th>
              <th class="text-left p-3 text-neutral-300">Ustabası</th>
              <th class="text-left p-3 text-neutral-300">Ürün Kodu</th>
              <th class="text-left p-3 text-neutral-300">Açıklama</th>
              <th class="text-left p-3 text-neutral-300">Makine/Hat</th>
              <th class="text-left p-3 text-neutral-300">Üretilen</th>
              <th class="text-left p-3 text-neutral-300">Fire</th>
              <th class="text-left p-3 text-neutral-300">Müşteri</th>
            </tr>
          </thead>
          <tbody>
            ${pageData.map(item => `
              <tr class="border-b border-neutral-700 hover:bg-neutral-700/50">
                <td class="p-3">
                  <button 
                    class="delete-btn text-red-400 hover:text-red-300 px-2 py-1 rounded text-xs"
                    data-saved-at="${item.savedAt || ''}"
                  >
                    Sil
                  </button>
                </td>
                <td class="p-3 text-white">${item.tarih || ''}</td>
                <td class="p-3 text-white">${item.vardiya || ''}</td>
                <td class="p-3 text-white">${item.ustabasi || ''}</td>
                <td class="p-3 text-white font-mono">${item.urunKodu || ''}</td>
                <td class="p-3 text-neutral-300">${item.aciklama || ''}</td>
                <td class="p-3 text-neutral-300">${item.makineHat || ''}</td>
                <td class="p-3 text-green-400">${item.uretilenAdet || '0'}</td>
                <td class="p-3 text-red-400">${item.fireAdet || '0'}</td>
                <td class="p-3 text-neutral-300">${item.musteri || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    container.innerHTML = tableHTML;
    
    // Bind delete buttons
    this.bindDeleteButtons();
  }

  /**
   * Render pagination
   */
  renderPagination() {
    const container = this.getRef('paginationContainer');
    const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }
    
    const paginationHTML = `
      <div class="flex items-center justify-between">
        <div class="text-sm text-neutral-400">
          ${this.filteredData.length} kayıttan ${(this.currentPage - 1) * this.pageSize + 1}-${Math.min(this.currentPage * this.pageSize, this.filteredData.length)} arası gösteriliyor
        </div>
        
        <div class="flex gap-2">
          <button 
            class="pagination-btn px-3 py-1 rounded ${this.currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-600'} bg-neutral-700 text-white"
            data-page="${this.currentPage - 1}"
            ${this.currentPage === 1 ? 'disabled' : ''}
          >
            Önceki
          </button>
          
          ${this.renderPageNumbers(totalPages)}
          
          <button 
            class="pagination-btn px-3 py-1 rounded ${this.currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-600'} bg-neutral-700 text-white"
            data-page="${this.currentPage + 1}"
            ${this.currentPage === totalPages ? 'disabled' : ''}
          >
            Sonraki
          </button>
        </div>
      </div>
    `;
    
    container.innerHTML = paginationHTML;
    
    // Bind pagination buttons
    this.bindPaginationButtons();
  }

  /**
   * Render page numbers
   */
  renderPageNumbers(totalPages) {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(`
        <button 
          class="pagination-btn px-3 py-1 rounded ${i === this.currentPage ? 'bg-indigo-600' : 'bg-neutral-700 hover:bg-neutral-600'} text-white"
          data-page="${i}"
        >
          ${i}
        </button>
      `);
    }
    
    return pages.join('');
  }

  /**
   * Bind delete buttons
   */
  bindDeleteButtons() {
    this.findAll('.delete-btn').forEach(btn => {
      this.addEventListener(btn, 'click', this.handleDelete.bind(this));
    });
  }

  /**
   * Bind pagination buttons
   */
  bindPaginationButtons() {
    this.findAll('.pagination-btn').forEach(btn => {
      if (!btn.disabled) {
        this.addEventListener(btn, 'click', (e) => {
          const page = parseInt(e.target.dataset.page);
          if (page && page !== this.currentPage) {
            this.currentPage = page;
            this.filterAndPaginate();
          }
        });
      }
    });
  }

  /**
   * Handle record deletion
   */
  async handleDelete(e) {
    const savedAt = e.target.dataset.savedAt;
    
    if (!savedAt || !confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      e.target.disabled = true;
      e.target.textContent = 'Siliniyor...';
      
      const result = await ProductionService.delete(savedAt);
      
      if (result.ok) {
        showToast('Kayıt başarıyla silindi', 'success');
        await this.loadData();
      } else {
        showError(result.error || 'Silme işlemi başarısız');
      }
      
    } catch (error) {
      showError('Silme sırasında hata oluştu');
    } finally {
      e.target.disabled = false;
      e.target.textContent = 'Sil';
    }
  }

  /**
   * Show loading indicator
   */
  showLoading() {
    this.getRef('loadingIndicator').classList.remove('hidden');
    this.getRef('tableContainer').classList.add('opacity-50');
  }

  /**
   * Hide loading indicator
   */
  hideLoading() {
    this.getRef('loadingIndicator').classList.add('hidden');
    this.getRef('tableContainer').classList.remove('opacity-50');
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorEl = this.getRef('errorMessage');
    errorEl.querySelector('p').textContent = message;
    errorEl.classList.remove('hidden');
  }

  /**
   * Setup auto-refresh
   */
  setupAutoRefresh() {
    const interval = this.getOption('refreshInterval');
    
    this.autoRefreshTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.loadData();
      }
    }, interval);
  }

  /**
   * Debounce utility
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Component lifecycle: before unmount
   */
  async beforeUnmount() {
    // Clear auto-refresh timer
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }
  }
}

// Export mount/unmount functions for compatibility
let currentInstance = null;

export const mount = withErrorHandling(async (container, options) => {
  if (currentInstance) {
    await currentInstance.unmount();
  }
  
  currentInstance = new ProductionScreen(container, options);
  await currentInstance.mount();
  
  // Set header
  if (options.setHeader) {
    options.setHeader('Üretim Takip', 'Üretim kayıtlarını yönetin');
  }
}, { context: 'production_screen_mount' });

export const unmount = withErrorHandling(async () => {
  if (currentInstance) {
    await currentInstance.unmount();
    currentInstance = null;
  }
}, { context: 'production_screen_unmount' });

export default ProductionScreen;