/**
 * Modern Module Loader - ES6+ Dynamic Import Manager
 * Professional module loading with error handling and caching
 */

class ModuleLoader {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Load a module with caching and error handling
   * @param {string} modulePath - Path to the module
   * @param {boolean} useCache - Whether to use cached version
   * @returns {Promise<Object>} - Module exports
   */
  async loadModule(modulePath, useCache = true) {
    const cacheKey = modulePath;
    
    // Return cached module if available
    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Return ongoing loading promise if exists
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Create loading promise
    const loadingPromise = this._loadModuleWithRetry(modulePath);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const module = await loadingPromise;
      
      // Cache successful load
      if (useCache) {
        this.cache.set(cacheKey, module);
      }
      
      return module;
    } catch (error) {
      // Remove failed loading promise
      this.loadingPromises.delete(cacheKey);
      throw error;
    } finally {
      // Clean up loading promise on completion
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Load module with retry mechanism
   * @private
   */
  async _loadModuleWithRetry(modulePath, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const module = await import(modulePath);
        return module;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to load module ${modulePath} after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Preload modules for better performance
   * @param {string[]} modulePaths - Array of module paths to preload
   */
  async preloadModules(modulePaths) {
    const preloadPromises = modulePaths.map(path => 
      this.loadModule(path).catch(error => {
        console.warn(`Failed to preload module ${path}:`, error);
        return null;
      })
    );
    
    await Promise.allSettled(preloadPromises);
  }

  /**
   * Clear module cache
   * @param {string} modulePath - Specific module to clear, or null for all
   */
  clearCache(modulePath = null) {
    if (modulePath) {
      this.cache.delete(modulePath);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedModules: this.cache.size,
      loadingModules: this.loadingPromises.size,
      cacheKeys: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const moduleLoader = new ModuleLoader();

/**
 * Modern async/await utility functions
 */
export const AsyncUtils = {
  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to wait
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Execute function with timeout
   * @param {Function} fn - Async function to execute
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} timeoutMessage - Custom timeout message
   */
  withTimeout: async (fn, timeoutMs = 5000, timeoutMessage = 'Operation timed out') => {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    );
    
    return Promise.race([fn(), timeoutPromise]);
  },

  /**
   * Retry async operation with exponential backoff
   * @param {Function} fn - Async function to retry
   * @param {Object} options - Retry options
   */
  retry: async (fn, options = {}) => {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      shouldRetry = () => true
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !shouldRetry(error)) {
          throw error;
        }
        
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        await AsyncUtils.delay(delay);
      }
    }
    
    throw lastError;
  },

  /**
   * Execute async operations in batches
   * @param {Array} items - Items to process
   * @param {Function} processor - Async processor function
   * @param {number} batchSize - Number of items per batch
   */
  batchProcess: async (items, processor, batchSize = 5) => {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(processor);
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
};

export default moduleLoader;