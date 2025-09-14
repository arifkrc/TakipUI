/**
 * Modern Application Router
 * Professional SPA routing with history management and lifecycle hooks
 */

class Router {
  constructor() {
    this.routes = new Map();
    this.middleware = [];
    this.currentRoute = null;
    this.currentModule = null;
    this.history = [];
    this.listeners = [];
    this.defaultRoute = null;
    this.notFoundRoute = null;
    
    this.init();
  }

  /**
   * Initialize router
   */
  init() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });

    // Listen for popstate (back/forward buttons)
    window.addEventListener('popstate', (event) => {
      this.handleRouteChange(event.state);
    });

    // Handle initial route
    this.handleRouteChange();
  }

  /**
   * Register a route
   * @param {string} path - Route path
   * @param {Object} config - Route configuration
   */
  route(path, config) {
    if (typeof config === 'string') {
      config = { module: config };
    }

    this.routes.set(path, {
      path,
      module: config.module,
      title: config.title || path,
      meta: config.meta || {},
      guards: config.guards || [],
      middleware: config.middleware || []
    });

    return this;
  }

  /**
   * Set default route
   * @param {string} path - Default route path
   */
  setDefault(path) {
    this.defaultRoute = path;
    return this;
  }

  /**
   * Set 404 route
   * @param {string} path - 404 route path
   */
  setNotFound(path) {
    this.notFoundRoute = path;
    return this;
  }

  /**
   * Add global middleware
   * @param {Function} middleware - Middleware function
   */
  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Navigate to route
   * @param {string} path - Route path
   * @param {Object} state - State object
   * @param {boolean} replace - Replace current history entry
   */
  navigate(path, state = null, replace = false) {
    const fullPath = path.startsWith('#') ? path : `#${path}`;
    
    if (replace) {
      window.location.replace(fullPath);
    } else {
      window.location.hash = fullPath;
    }

    if (state) {
      window.history.replaceState(state, '', fullPath);
    }
  }

  /**
   * Go back in history
   */
  back() {
    window.history.back();
  }

  /**
   * Go forward in history
   */
  forward() {
    window.history.forward();
  }

  /**
   * Handle route change
   * @param {Object} state - History state
   */
  async handleRouteChange(state = null) {
    const hash = window.location.hash.replace('#', '') || this.defaultRoute || '';
    const route = this.findRoute(hash);

    if (!route) {
      if (this.notFoundRoute) {
        this.navigate(this.notFoundRoute, null, true);
        return;
      } else {
        console.error(`Route not found: ${hash}`);
        return;
      }
    }

    try {
      // Run global middleware
      for (const middleware of this.middleware) {
        const result = await middleware(route, this.currentRoute);
        if (result === false) {
          return; // Middleware blocked navigation
        }
      }

      // Run route-specific middleware
      for (const middleware of route.middleware) {
        const result = await middleware(route, this.currentRoute);
        if (result === false) {
          return; // Middleware blocked navigation
        }
      }

      // Run route guards
      for (const guard of route.guards) {
        const result = await guard(route, this.currentRoute);
        if (result === false) {
          return; // Guard blocked navigation
        }
      }

      await this.loadRoute(route, state);

    } catch (error) {
      console.error('Error handling route change:', error);
      this.emitEvent('error', { error, route });
    }
  }

  /**
   * Find route by path
   * @param {string} path - Route path
   */
  findRoute(path) {
    // Exact match first
    if (this.routes.has(path)) {
      return this.routes.get(path);
    }

    // Pattern matching (simple wildcard support)
    for (const [routePath, route] of this.routes) {
      if (this.matchRoute(routePath, path)) {
        return { ...route, params: this.extractParams(routePath, path) };
      }
    }

    return null;
  }

  /**
   * Match route pattern
   * @param {string} pattern - Route pattern
   * @param {string} path - Actual path
   */
  matchRoute(pattern, path) {
    if (pattern === path) return true;
    
    // Simple wildcard matching
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    
    if (patternParts.length !== pathParts.length) return false;
    
    return patternParts.every((part, index) => {
      return part.startsWith(':') || part === pathParts[index];
    });
  }

  /**
   * Extract route parameters
   * @param {string} pattern - Route pattern
   * @param {string} path - Actual path
   */
  extractParams(pattern, path) {
    const params = {};
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    
    patternParts.forEach((part, index) => {
      if (part.startsWith(':')) {
        const paramName = part.substring(1);
        params[paramName] = pathParts[index];
      }
    });
    
    return params;
  }

  /**
   * Load route module
   * @param {Object} route - Route configuration
   * @param {Object} state - History state
   */
  async loadRoute(route, state = null) {
    const prevRoute = this.currentRoute;
    const prevModule = this.currentModule;

    try {
      // Emit before route change
      this.emitEvent('beforeRouteChange', { route, prevRoute, state });

      // Unmount previous module
      if (prevModule && typeof prevModule.unmount === 'function') {
        await prevModule.unmount();
      }

      // Load new module
      const module = await this.loadModule(route.module);
      
      // Update current route and module
      this.currentRoute = route;
      this.currentModule = module;

      // Update document title
      if (route.title) {
        document.title = route.title;
      }

      // Mount new module
      if (module && typeof module.mount === 'function') {
        const container = document.getElementById('content');
        await module.mount(container, {
          route,
          state,
          router: this,
          setHeader: this.setHeader.bind(this)
        });
      }

      // Add to history
      this.addToHistory(route, state);

      // Emit after route change
      this.emitEvent('afterRouteChange', { route, prevRoute, state });

    } catch (error) {
      console.error('Error loading route:', error);
      this.emitEvent('error', { error, route, prevRoute });
      throw error;
    }
  }

  /**
   * Load module dynamically
   * @param {string} modulePath - Module path
   */
  async loadModule(modulePath) {
    try {
      const module = await import(`../screens/${modulePath}.js`);
      return module;
    } catch (error) {
      console.error(`Failed to load module: ${modulePath}`, error);
      throw error;
    }
  }

  /**
   * Set page header
   * @param {string} title - Page title
   * @param {string} subtitle - Page subtitle
   */
  setHeader(title, subtitle = '') {
    const headerTitle = document.getElementById('screen-title');
    const headerSub = document.getElementById('screen-sub');
    
    if (headerTitle) headerTitle.textContent = title;
    if (headerSub) headerSub.textContent = subtitle;
  }

  /**
   * Add route to history
   * @param {Object} route - Route object
   * @param {Object} state - State object
   */
  addToHistory(route, state) {
    this.history.push({
      route,
      state,
      timestamp: Date.now()
    });

    // Keep history size manageable
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }
  }

  /**
   * Get current route
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Get current path
   */
  getCurrentPath() {
    return window.location.hash.replace('#', '');
  }

  /**
   * Get route history
   * @param {number} limit - Number of entries to return
   */
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   */
  on(event, listener) {
    this.listeners.push({ event, listener });
    return () => {
      const index = this.listeners.findIndex(l => l.listener === listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitEvent(event, data) {
    this.listeners
      .filter(l => l.event === event)
      .forEach(l => {
        try {
          l.listener(data);
        } catch (error) {
          console.error('Error in route event listener:', error);
        }
      });
  }

  /**
   * Create navigation link
   * @param {string} path - Route path
   * @param {string} text - Link text
   * @param {Object} attributes - Additional attributes
   */
  createLink(path, text, attributes = {}) {
    const link = document.createElement('a');
    link.href = `#${path}`;
    link.textContent = text;
    
    Object.entries(attributes).forEach(([key, value]) => {
      link.setAttribute(key, value);
    });

    link.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigate(path);
    });

    return link;
  }

  /**
   * Check if route is active
   * @param {string} path - Route path
   */
  isActive(path) {
    return this.getCurrentPath() === path;
  }

  /**
   * Refresh current route
   */
  refresh() {
    this.handleRouteChange();
  }
}

// Global router instance
export const router = new Router();

// Authentication guard
export const authGuard = async (route, prevRoute) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === '1';
  
  if (!isLoggedIn && route.path !== 'login') {
    router.navigate('login');
    return false;
  }
  
  return true;
};

// Setup default routes
router
  .route('login', {
    module: 'login',
    title: 'Giriş - TakipUI',
    meta: { requiresAuth: false }
  })
  .route('uretim', {
    module: 'uretim',
    title: 'Üretim - TakipUI',
    guards: [authGuard]
  })
  .route('paketleme', {
    module: 'paketleme',
    title: 'Paketleme - TakipUI',
    guards: [authGuard]
  })
  .route('urun', {
    module: 'urun',
    title: 'Ürünler - TakipUI',
    guards: [authGuard]
  })
  .route('operasyon', {
    module: 'operasyon',
    title: 'Operasyonlar - TakipUI',
    guards: [authGuard]
  })
  .route('siparis', {
    module: 'siparis',
    title: 'Siparişler - TakipUI',
    guards: [authGuard]
  })
  .setDefault('uretim')
  .setNotFound('uretim');

// Add global middleware for loading state
router.use(async (route, prevRoute) => {
  const content = document.getElementById('content');
  if (content) {
    content.innerHTML = '<div class="p-4 text-neutral-400">Yükleniyor...</div>';
  }
  return true;
});

export default router;