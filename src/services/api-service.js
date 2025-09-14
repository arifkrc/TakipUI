/**
 * Modern API Service Layer
 * Professional service architecture with error handling and caching
 */

class APIError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

class APIService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  /**
   * Add request interceptor
   * @param {Function} interceptor - Function to modify request
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   * @param {Function} interceptor - Function to modify response
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Make API call with modern error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      data = null,
      useCache = false,
      cacheTimeout = this.cacheTimeout,
      ...restOptions
    } = options;

    const cacheKey = `${method}:${endpoint}:${JSON.stringify(data)}`;

    // Check cache for GET requests
    if (method === 'GET' && useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      // Apply request interceptors
      let processedData = data;
      for (const interceptor of this.requestInterceptors) {
        processedData = await interceptor(processedData, endpoint, options);
      }

      // Make the actual API call through Electron IPC
      const result = await this._makeElectronAPICall(endpoint, {
        method,
        data: processedData,
        ...restOptions
      });

      // Apply response interceptors
      let processedResult = result;
      for (const interceptor of this.responseInterceptors) {
        processedResult = await interceptor(processedResult, endpoint, options);
      }

      // Cache successful GET requests
      if (method === 'GET' && useCache && processedResult.ok) {
        this.cache.set(cacheKey, {
          data: processedResult,
          timestamp: Date.now()
        });
      }

      return processedResult;

    } catch (error) {
      throw new APIError(
        error.message || 'API request failed',
        error.status || 500,
        error.data
      );
    }
  }

  /**
   * Internal method to call Electron API
   * @private
   */
  async _makeElectronAPICall(endpoint, options) {
    const { method, data } = options;
    
    // Map API endpoints to Electron IPC calls
    const endpointMap = {
      'uretim': {
        GET: () => window.electronAPI.listUretim(),
        POST: (data) => window.electronAPI.saveUretim(data),
        DELETE: (data) => window.electronAPI.deleteUretim(data.savedAt)
      },
      'paketleme': {
        GET: () => window.electronAPI.listPaketleme(),
        POST: (data) => window.electronAPI.savePaketleme(data),
        DELETE: (data) => window.electronAPI.deletePaketleme(data.savedAt)
      },
      'urun': {
        GET: () => window.electronAPI.listUrun(),
        POST: (data) => window.electronAPI.saveUrun(data),
        DELETE: (data) => window.electronAPI.deleteUrun(data.savedAt)
      },
      'operasyon': {
        GET: () => window.electronAPI.listOperasyon(),
        POST: (data) => window.electronAPI.saveOperasyon(data),
        DELETE: (data) => window.electronAPI.deleteOperasyon(data.savedAt)
      },
      'siparis': {
        GET: () => window.electronAPI.listSiparis(),
        POST: (data) => window.electronAPI.saveSiparis(data),
        DELETE: (data) => window.electronAPI.deleteSiparis(data.savedAt)
      },
      'operation-types': {
        GET: (data) => window.electronAPI.getOperationTypes(data?.onlyActive || false)
      }
    };

    const endpointHandler = endpointMap[endpoint];
    if (!endpointHandler || !endpointHandler[method]) {
      throw new APIError(`Unsupported endpoint: ${method} ${endpoint}`, 404);
    }

    return await endpointHandler[method](data);
  }

  /**
   * Clear API cache
   * @param {string} pattern - Optional pattern to match cache keys
   */
  clearCache(pattern = null) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, value] of this.cache) {
      if (now - value.timestamp < this.cacheTimeout) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheHitRate: this.cacheHitRate || 0
    };
  }
}

// Service instances
export const apiService = new APIService();

// Add default error handling interceptor
apiService.addResponseInterceptor(async (response, endpoint, options) => {
  if (!response.ok && response.error) {
    console.error(`API Error [${endpoint}]:`, response.error);
  }
  return response;
});

/**
 * Specialized service classes
 */
export class ProductionService {
  static async list(useCache = true) {
    return apiService.request('uretim', { useCache });
  }

  static async save(data) {
    const result = await apiService.request('uretim', {
      method: 'POST',
      data
    });
    
    // Clear related cache
    apiService.clearCache('GET:uretim');
    return result;
  }

  static async delete(savedAt) {
    const result = await apiService.request('uretim', {
      method: 'DELETE',
      data: { savedAt }
    });
    
    // Clear related cache
    apiService.clearCache('GET:uretim');
    return result;
  }
}

export class PackagingService {
  static async list(useCache = true) {
    return apiService.request('paketleme', { useCache });
  }

  static async save(data) {
    const result = await apiService.request('paketleme', {
      method: 'POST',
      data
    });
    
    apiService.clearCache('GET:paketleme');
    return result;
  }

  static async delete(savedAt) {
    const result = await apiService.request('paketleme', {
      method: 'DELETE',
      data: { savedAt }
    });
    
    apiService.clearCache('GET:paketleme');
    return result;
  }
}

export class ProductService {
  static async list(useCache = true) {
    return apiService.request('urun', { useCache });
  }

  static async save(data) {
    const result = await apiService.request('urun', {
      method: 'POST',
      data
    });
    
    apiService.clearCache('GET:urun');
    return result;
  }

  static async delete(savedAt) {
    const result = await apiService.request('urun', {
      method: 'DELETE',
      data: { savedAt }
    });
    
    apiService.clearCache('GET:urun');
    return result;
  }
}

export class OperationService {
  static async list(useCache = true) {
    return apiService.request('operasyon', { useCache });
  }

  static async save(data) {
    const result = await apiService.request('operasyon', {
      method: 'POST',
      data
    });
    
    apiService.clearCache('GET:operasyon');
    return result;
  }

  static async delete(savedAt) {
    const result = await apiService.request('operasyon', {
      method: 'DELETE',
      data: { savedAt }
    });
    
    apiService.clearCache('GET:operasyon');
    return result;
  }

  static async getTypes(onlyActive = false, useCache = true) {
    return apiService.request('operation-types', {
      data: { onlyActive },
      useCache
    });
  }
}

export class OrderService {
  static async list(useCache = true) {
    return apiService.request('siparis', { useCache });
  }

  static async save(data) {
    const result = await apiService.request('siparis', {
      method: 'POST',
      data
    });
    
    apiService.clearCache('GET:siparis');
    return result;
  }

  static async delete(savedAt) {
    const result = await apiService.request('siparis', {
      method: 'DELETE',
      data: { savedAt }
    });
    
    apiService.clearCache('GET:siparis');
    return result;
  }

  static async import(filePaths) {
    return window.electronAPI.importSiparis(filePaths);
  }

  static async preview() {
    return window.electronAPI.previewSiparis();
  }
}

export default apiService;