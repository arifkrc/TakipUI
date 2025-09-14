/**
 * Modern Application State Manager
 * Professional state management with reactive updates and persistence
 */

class StateManager {
  constructor() {
    this.state = {};
    this.listeners = new Map();
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 50;
    this.debugMode = false;
  }

  /**
   * Initialize state with default values
   * @param {Object} initialState - Initial state object
   */
  init(initialState = {}) {
    this.state = { ...initialState };
    this.saveToHistory('INIT', initialState);
    this.notifyListeners('*', this.state);
  }

  /**
   * Get current state or specific property
   * @param {string} path - Property path (dot notation supported)
   */
  get(path = null) {
    if (!path) return { ...this.state };
    
    return this.getNestedProperty(this.state, path);
  }

  /**
   * Set state property
   * @param {string|Object} pathOrState - Property path or state object
   * @param {*} value - Value to set (if path provided)
   */
  set(pathOrState, value = undefined) {
    const oldState = { ...this.state };
    
    if (typeof pathOrState === 'object') {
      // Merge state object
      this.state = { ...this.state, ...pathOrState };
      this.processStateChange('SET_MULTIPLE', oldState, this.state);
    } else {
      // Set specific property
      this.setNestedProperty(this.state, pathOrState, value);
      this.processStateChange('SET_PROPERTY', oldState, this.state, { path: pathOrState, value });
    }
  }

  /**
   * Update state with function
   * @param {string} path - Property path
   * @param {Function} updater - Update function
   */
  update(path, updater) {
    const currentValue = this.get(path);
    const newValue = updater(currentValue);
    this.set(path, newValue);
  }

  /**
   * Remove property from state
   * @param {string} path - Property path to remove
   */
  remove(path) {
    const oldState = { ...this.state };
    this.deleteNestedProperty(this.state, path);
    this.processStateChange('REMOVE_PROPERTY', oldState, this.state, { path });
  }

  /**
   * Subscribe to state changes
   * @param {string} path - Property path to watch ('*' for all changes)
   * @param {Function} listener - Change listener function
   */
  subscribe(path, listener) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    
    this.listeners.get(path).add(listener);
    
    // Return unsubscribe function
    return () => {
      const pathListeners = this.listeners.get(path);
      if (pathListeners) {
        pathListeners.delete(listener);
        if (pathListeners.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  /**
   * Add middleware for state changes
   * @param {Function} middleware - Middleware function
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Process state change through middleware and notify listeners
   * @private
   */
  processStateChange(action, oldState, newState, meta = {}) {
    // Apply middleware
    let processedState = newState;
    for (const middleware of this.middleware) {
      processedState = middleware(action, oldState, processedState, meta);
    }
    
    this.state = processedState;
    this.saveToHistory(action, processedState, meta);
    
    // Notify listeners
    this.notifyListeners('*', processedState, oldState);
    
    // Notify specific path listeners
    if (meta.path) {
      this.notifyListeners(meta.path, this.get(meta.path), this.getNestedProperty(oldState, meta.path));
    }
    
    // Debug logging
    if (this.debugMode) {
      console.log(`[StateManager] ${action}:`, {
        oldState,
        newState: processedState,
        meta
      });
    }
  }

  /**
   * Notify listeners for a specific path
   * @private
   */
  notifyListeners(path, newValue, oldValue = undefined) {
    const pathListeners = this.listeners.get(path);
    if (!pathListeners) return;
    
    pathListeners.forEach(listener => {
      try {
        listener(newValue, oldValue, path);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  /**
   * Save state change to history
   * @private
   */
  saveToHistory(action, state, meta = {}) {
    this.history.push({
      action,
      state: JSON.parse(JSON.stringify(state)),
      meta,
      timestamp: Date.now()
    });
    
    // Keep history size manageable
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
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
   * Delete nested property using dot notation
   * @private
   */
  deleteNestedProperty(obj, path) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      return current && current[key] ? current[key] : null;
    }, obj);
    
    if (target && target.hasOwnProperty(lastKey)) {
      delete target[lastKey];
    }
  }

  /**
   * Reset state to initial values
   */
  reset() {
    const oldState = { ...this.state };
    this.state = {};
    this.processStateChange('RESET', oldState, this.state);
  }

  /**
   * Get state history
   * @param {number} limit - Number of history entries to return
   */
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Debug mode enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Persist state to localStorage
   * @param {string} key - Storage key
   */
  persist(key = 'app_state') {
    try {
      localStorage.setItem(key, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  /**
   * Restore state from localStorage
   * @param {string} key - Storage key
   */
  restore(key = 'app_state') {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsedState = JSON.parse(stored);
        this.init(parsedState);
        return true;
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
    return false;
  }
}

// Global state manager instance
export const appState = new StateManager();

// Initialize app state with default values
appState.init({
  user: {
    isLoggedIn: false,
    preferences: {
      theme: 'dark',
      language: 'tr'
    }
  },
  ui: {
    currentScreen: 'uretim',
    loading: false,
    sidebarOpen: true
  },
  data: {
    cache: {},
    lastUpdate: null
  }
});

// Add persistence middleware
appState.addMiddleware((action, oldState, newState) => {
  // Auto-persist certain state changes
  if (['SET_MULTIPLE', 'SET_PROPERTY'].includes(action)) {
    setTimeout(() => appState.persist(), 100);
  }
  return newState;
});

/**
 * Reactive state hooks for components
 */
export const useAppState = (path = null) => {
  return {
    get: () => appState.get(path),
    set: (value) => appState.set(path, value),
    update: (updater) => appState.update(path, updater),
    subscribe: (listener) => appState.subscribe(path, listener)
  };
};

/**
 * State computed properties
 */
export const computed = {
  isAuthenticated: () => appState.get('user.isLoggedIn'),
  currentTheme: () => appState.get('user.preferences.theme'),
  isLoading: () => appState.get('ui.loading'),
  currentScreen: () => appState.get('ui.currentScreen')
};

export default appState;