/**
 * Modern App Entry Point
 * Professional application initialization with dependency injection
 */

import { moduleLoader } from './utils/module-loader.js';
import { errorHandler } from './utils/error-handler.js';
import { config, ENV } from './config/config.js';
import { appState } from './state/app-state.js';
import { router } from './router/router.js';
import { showToast } from './components/Toast.js';

class Application {
  constructor() {
    this.initialized = false;
    this.modules = new Map();
    this.services = new Map();
    this.startTime = Date.now();
  }

  /**
   * Initialize application
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('🚀 TakipUI Application Starting...');
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Load configuration
      await this.loadConfiguration();
      
      // Initialize services
      await this.initializeServices();
      
      // Setup routing
      await this.setupRouting();
      
      // Setup UI
      await this.setupUI();
      
      // Restore application state
      await this.restoreState();
      
      this.initialized = true;
      
      const initTime = Date.now() - this.startTime;
      console.log(`✅ TakipUI initialized in ${initTime}ms`);
      
      if (ENV.isDevelopment()) {
        this.setupDevelopmentTools();
      }
      
    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      errorHandler.handleError(error, {
        context: 'app_initialization',
        severity: 'critical'
      });
      throw error;
    }
  }

  /**
   * Setup global error handling
   */
  setupErrorHandling() {
    // Add application-specific error listener
    errorHandler.addErrorListener((errorInfo) => {
      // Log critical errors to external service in production
      if (ENV.isProduction() && errorInfo.severity === 'critical') {
        this.logToExternalService(errorInfo);
      }
    });

    // Set debug mode based on environment
    errorHandler.debugMode = ENV.isDevelopment();
  }

  /**
   * Load and validate configuration
   */
  async loadConfiguration() {
    // Validate configuration
    const validation = config.validate();
    
    if (!validation.isValid) {
      console.warn('Configuration validation warnings:', validation.errors);
    }
    
    // Setup configuration watchers
    this.setupConfigurationWatchers();
  }

  /**
   * Initialize core services
   */
  async initializeServices() {
    try {
      // Preload core modules
      await moduleLoader.preloadModules([
        './services/api-service.js',
        './components/Toast.js'
      ]);
      
      console.log('✅ Core services initialized');
      
    } catch (error) {
      console.error('Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Setup application routing
   */
  async setupRouting() {
    // Add global route middleware for authentication check
    router.use(async (route, prevRoute) => {
      // Update app state with current route
      appState.set('ui.currentScreen', route.path);
      
      // Performance tracking
      if (ENV.isDevelopment()) {
        console.log(`🔄 Route change: ${prevRoute?.path || 'none'} → ${route.path}`);
      }
      
      return true;
    });

    // Setup route error handling
    router.on('error', ({ error, route }) => {
      errorHandler.handleError(error, {
        context: 'routing',
        route: route.path,
        severity: 'high'
      });
    });
  }

  /**
   * Setup UI components
   */
  async setupUI() {
    // Setup global keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Setup theme management
    this.setupThemeManagement();
    
    // Setup responsive design handlers
    this.setupResponsiveHandlers();
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    const shortcuts = {
      'Ctrl+/': () => this.showShortcutsHelp(),
      'Ctrl+R': (e) => {
        e.preventDefault();
        router.refresh();
      },
      'Escape': () => {
        // Close modals, clear selections, etc.
        this.handleEscapeKey();
      }
    };

    document.addEventListener('keydown', (e) => {
      const key = `${e.ctrlKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
      
      if (shortcuts[key]) {
        shortcuts[key](e);
      }
    });
  }

  /**
   * Setup theme management
   */
  setupThemeManagement() {
    const theme = appState.get('user.preferences.theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    
    // Watch for theme changes
    appState.subscribe('user.preferences.theme', (newTheme) => {
      document.documentElement.setAttribute('data-theme', newTheme);
    });
  }

  /**
   * Setup responsive design handlers
   */
  setupResponsiveHandlers() {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    
    const handleMobileChange = (e) => {
      appState.set('ui.isMobile', e.matches);
    };
    
    handleMobileChange(mediaQuery);
    mediaQuery.addListener(handleMobileChange);
  }

  /**
   * Restore application state
   */
  async restoreState() {
    // Restore state from localStorage
    if (!appState.restore()) {
      console.log('No previous state found, using defaults');
    }
    
    // Check authentication state
    const isLoggedIn = localStorage.getItem('isLoggedIn') === '1';
    appState.set('user.isLoggedIn', isLoggedIn);
    
    if (isLoggedIn) {
      // Show main navigation
      this.showMainNavigation();
    } else {
      // Hide main navigation and redirect to login
      this.hideMainNavigation();
      router.navigate('login');
    }
  }

  /**
   * Setup configuration watchers
   */
  setupConfigurationWatchers() {
    // Watch for theme changes
    appState.subscribe('user.preferences.theme', (theme) => {
      config.set('ui.theme', theme);
    });
    
    // Watch for language changes
    appState.subscribe('user.preferences.language', (language) => {
      config.set('ui.language', language);
    });
  }

  /**
   * Show main navigation
   */
  showMainNavigation() {
    const tabsContainer = document.querySelector('.tabs');
    const logoutBtn = document.getElementById('logout');
    
    if (tabsContainer) {
      tabsContainer.style.display = '';
      this.setupNavigationHandlers();
    }
    
    if (logoutBtn) {
      logoutBtn.style.display = '';
      this.setupLogoutHandler();
    }
  }

  /**
   * Hide main navigation
   */
  hideMainNavigation() {
    const tabsContainer = document.querySelector('.tabs');
    const logoutBtn = document.getElementById('logout');
    
    if (tabsContainer) tabsContainer.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }

  /**
   * Setup navigation handlers
   */
  setupNavigationHandlers() {
    document.querySelectorAll('.tabs .nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const screen = btn.dataset && btn.dataset.screen;
        if (screen) {
          router.navigate(screen);
        }
      });
    });
  }

  /**
   * Setup logout handler
   */
  setupLogoutHandler() {
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }
  }

  /**
   * Handle user login
   */
  async login() {
    appState.set('user.isLoggedIn', true);
    localStorage.setItem('isLoggedIn', '1');
    
    this.showMainNavigation();
    
    // Restore last screen or go to default
    const lastScreen = localStorage.getItem('lastScreen') || 'uretim';
    router.navigate(lastScreen);
    
    showToast('Başarıyla giriş yapıldı', 'success');
  }

  /**
   * Handle user logout
   */
  async logout() {
    appState.set('user.isLoggedIn', false);
    localStorage.removeItem('isLoggedIn');
    
    this.hideMainNavigation();
    router.navigate('login');
    
    showToast('Çıkış yapıldı', 'info');
  }

  /**
   * Show keyboard shortcuts help
   */
  showShortcutsHelp() {
    const shortcuts = [
      { key: 'Ctrl + Tab', description: 'Sonraki sekme' },
      { key: 'Ctrl + Shift + Tab', description: 'Önceki sekme' },
      { key: 'Ctrl + R', description: 'Sayfayı yenile' },
      { key: 'Ctrl + /', description: 'Kısayolları göster' },
      { key: 'Escape', description: 'İptal/Kapat' }
    ];

    const helpContent = shortcuts
      .map(s => `<div class="flex justify-between"><kbd>${s.key}</kbd><span>${s.description}</span></div>`)
      .join('');

    showToast(helpContent, 'info', {
      html: true,
      duration: 10000,
      persistent: false
    });
  }

  /**
   * Handle escape key
   */
  handleEscapeKey() {
    // Close any open modals, dropdowns, etc.
    document.querySelectorAll('.modal, .dropdown-open').forEach(el => {
      el.classList.remove('open', 'dropdown-open');
    });
    
    // Clear any active selections
    window.getSelection().removeAllRanges();
  }

  /**
   * Setup development tools
   */
  setupDevelopmentTools() {
    console.log('🛠️ Development mode enabled');
    
    // Expose useful objects to window for debugging
    window.app = this;
    window.appState = appState;
    window.config = config;
    window.router = router;
    window.moduleLoader = moduleLoader;
    window.errorHandler = errorHandler;
    
    // Add performance monitoring
    this.setupPerformanceMonitoring();
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor memory usage
    if (performance.memory) {
      setInterval(() => {
        const memory = performance.memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        
        if (usedMB > config.get('performance.memoryWarningThreshold') / 1024 / 1024) {
          console.warn(`High memory usage: ${usedMB}MB / ${limitMB}MB`);
        }
      }, 30000); // Check every 30 seconds
    }
    
    // Monitor route performance
    router.on('afterRouteChange', ({ route }) => {
      const loadTime = Date.now() - this.startTime;
      console.log(`Route ${route.path} loaded in ${loadTime}ms`);
    });
  }

  /**
   * Log error to external service (placeholder)
   */
  async logToExternalService(errorInfo) {
    // In production, send to external logging service
    console.log('Would send to external service:', errorInfo);
  }

  /**
   * Get application statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      uptime: Date.now() - this.startTime,
      currentRoute: router.getCurrentRoute(),
      errorCount: errorHandler.getErrorLogs().length,
      cacheStats: moduleLoader.getCacheStats(),
      memoryUsage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null
    };
  }
}

// Global application instance
const app = new Application();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Export for external use
export { app };
export default app;