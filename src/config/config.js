/**
 * Modern Configuration Manager
 * Environment-aware configuration with validation and type safety
 */

class ConfigManager {
  constructor() {
    this.config = {};
    this.environment = this.detectEnvironment();
    this.validators = new Map();
    this.loadDefaultConfig();
  }

  /**
   * Detect current environment
   * @private
   */
  detectEnvironment() {
    // In Electron renderer process
    if (typeof window !== 'undefined' && window.electronAPI) {
      return process.env.NODE_ENV || 'development';
    }
    return 'production';
  }

  /**
   * Load default configuration
   * @private
   */
  loadDefaultConfig() {
    this.config = {
      app: {
        name: 'TakipUI',
        version: '1.0.0',
        debug: this.environment === 'development'
      },
      api: {
        baseUrl: 'https://localhost:7287',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      ui: {
        theme: 'dark',
        language: 'tr',
        pageSize: 20,
        animationDuration: 300,
        toastDuration: 5000,
        maxToasts: 5
      },
      cache: {
        defaultTTL: 5 * 60 * 1000, // 5 minutes
        maxSize: 100,
        persistent: true
      },
      security: {
        allowUnsafeEval: false,
        allowUnsafeInline: false,
        strictCSP: true
      },
      logging: {
        level: this.environment === 'development' ? 'debug' : 'info',
        maxLogSize: 1000,
        persistLogs: false
      },
      performance: {
        enableMetrics: this.environment === 'development',
        memoryWarningThreshold: 100 * 1024 * 1024, // 100MB
        debounceDelay: 300
      }
    };

    // Environment-specific overrides
    this.applyEnvironmentConfig();
  }

  /**
   * Apply environment-specific configuration
   * @private
   */
  applyEnvironmentConfig() {
    const envConfigs = {
      development: {
        app: { debug: true },
        logging: { level: 'debug', persistLogs: true },
        performance: { enableMetrics: true },
        cache: { defaultTTL: 60000 } // 1 minute for dev
      },
      production: {
        app: { debug: false },
        logging: { level: 'error', persistLogs: false },
        performance: { enableMetrics: false },
        security: { strictCSP: true }
      },
      test: {
        app: { debug: false },
        logging: { level: 'silent' },
        cache: { defaultTTL: 1000 },
        ui: { animationDuration: 0 }
      }
    };

    const envConfig = envConfigs[this.environment];
    if (envConfig) {
      this.config = this.deepMerge(this.config, envConfig);
    }
  }

  /**
   * Get configuration value
   * @param {string} path - Configuration path (dot notation)
   * @param {*} defaultValue - Default value if not found
   */
  get(path, defaultValue = undefined) {
    const value = this.getNestedProperty(this.config, path);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set configuration value
   * @param {string} path - Configuration path
   * @param {*} value - Value to set
   */
  set(path, value) {
    // Validate if validator exists
    const validator = this.validators.get(path);
    if (validator && !validator(value)) {
      throw new Error(`Invalid configuration value for ${path}: ${value}`);
    }

    this.setNestedProperty(this.config, path, value);
    this.persistConfig();
  }

  /**
   * Update configuration with object
   * @param {Object} updates - Configuration updates
   */
  update(updates) {
    this.config = this.deepMerge(this.config, updates);
    this.persistConfig();
  }

  /**
   * Add configuration validator
   * @param {string} path - Configuration path
   * @param {Function} validator - Validation function
   */
  addValidator(path, validator) {
    this.validators.set(path, validator);
  }

  /**
   * Get nested property using dot notation
   * @private
   */
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set nested property using dot notation
   * @private
   */
  setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  /**
   * Deep merge objects
   * @private
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Persist configuration to localStorage
   * @private
   */
  persistConfig() {
    try {
      const userConfig = this.extractUserConfig();
      localStorage.setItem('app_config', JSON.stringify(userConfig));
    } catch (error) {
      console.error('Failed to persist configuration:', error);
    }
  }

  /**
   * Extract user-configurable settings
   * @private
   */
  extractUserConfig() {
    return {
      ui: this.config.ui,
      cache: {
        defaultTTL: this.config.cache.defaultTTL,
        persistent: this.config.cache.persistent
      },
      logging: {
        level: this.config.logging.level
      }
    };
  }

  /**
   * Load configuration from localStorage
   */
  loadUserConfig() {
    try {
      const stored = localStorage.getItem('app_config');
      if (stored) {
        const userConfig = JSON.parse(stored);
        this.config = this.deepMerge(this.config, userConfig);
        return true;
      }
    } catch (error) {
      console.error('Failed to load user configuration:', error);
    }
    return false;
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this.loadDefaultConfig();
    localStorage.removeItem('app_config');
  }

  /**
   * Get environment
   */
  getEnvironment() {
    return this.environment;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebug() {
    return this.get('app.debug', false);
  }

  /**
   * Get all configuration
   */
  getAll() {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];
    
    for (const [path, validator] of this.validators) {
      const value = this.get(path);
      if (value !== undefined && !validator(value)) {
        errors.push(`Invalid value for ${path}: ${value}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Global configuration manager instance
export const config = new ConfigManager();

// Add common validators
config.addValidator('ui.theme', (value) => ['light', 'dark'].includes(value));
config.addValidator('ui.language', (value) => ['tr', 'en'].includes(value));
config.addValidator('ui.pageSize', (value) => Number.isInteger(value) && value > 0 && value <= 100);
config.addValidator('api.timeout', (value) => Number.isInteger(value) && value > 0);
config.addValidator('cache.defaultTTL', (value) => Number.isInteger(value) && value > 0);
config.addValidator('logging.level', (value) => ['silent', 'error', 'warn', 'info', 'debug'].includes(value));

// Load user configuration on startup
config.loadUserConfig();

/**
 * Configuration constants
 */
export const CONFIG = {
  // API endpoints
  API: {
    BASE_URL: config.get('api.baseUrl'),
    TIMEOUT: config.get('api.timeout'),
    RETRY_ATTEMPTS: config.get('api.retryAttempts')
  },
  
  // UI constants
  UI: {
    PAGE_SIZE: config.get('ui.pageSize'),
    ANIMATION_DURATION: config.get('ui.animationDuration'),
    TOAST_DURATION: config.get('ui.toastDuration'),
    MAX_TOASTS: config.get('ui.maxToasts')
  },
  
  // Cache settings
  CACHE: {
    TTL: config.get('cache.defaultTTL'),
    MAX_SIZE: config.get('cache.maxSize'),
    PERSISTENT: config.get('cache.persistent')
  },
  
  // Performance thresholds
  PERFORMANCE: {
    DEBOUNCE_DELAY: config.get('performance.debounceDelay'),
    MEMORY_WARNING: config.get('performance.memoryWarningThreshold')
  }
};

/**
 * Environment helpers
 */
export const ENV = {
  isDevelopment: () => config.getEnvironment() === 'development',
  isProduction: () => config.getEnvironment() === 'production',
  isTest: () => config.getEnvironment() === 'test',
  isDebug: () => config.isDebug()
};

export default config;