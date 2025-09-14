/**
 * Modern Error Handling System
 * Professional error management with user feedback and logging
 */

class ErrorHandler {
  constructor() {
    this.errorListeners = [];
    this.logBuffer = [];
    this.maxLogSize = 1000;
    
    // Global error handlers
    this.setupGlobalErrorHandling();
  }

  /**
   * Setup global error handlers for unhandled errors
   */
  setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'unhandled_rejection',
        context: 'global'
      });
      event.preventDefault();
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        type: 'uncaught_error',
        context: 'global',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }

  /**
   * Main error handling method
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional error context
   */
  handleError(error, context = {}) {
    const errorInfo = this.processError(error, context);
    
    // Log error
    this.logError(errorInfo);
    
    // Notify listeners
    this.notifyListeners(errorInfo);
    
    // Show user feedback if appropriate
    if (context.showToUser !== false) {
      this.showUserFeedback(errorInfo);
    }
    
    return errorInfo;
  }

  /**
   * Process error into standardized format
   * @private
   */
  processError(error, context) {
    const timestamp = new Date().toISOString();
    const id = this.generateErrorId();
    
    let message, stack, name;
    
    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
      name = error.name;
    } else if (typeof error === 'string') {
      message = error;
      stack = new Error(error).stack;
      name = 'StringError';
    } else {
      message = 'Unknown error occurred';
      stack = new Error().stack;
      name = 'UnknownError';
    }

    return {
      id,
      timestamp,
      message,
      stack,
      name,
      context,
      severity: this.determineSeverity(error, context),
      userMessage: this.generateUserMessage(error, context)
    };
  }

  /**
   * Determine error severity
   * @private
   */
  determineSeverity(error, context) {
    if (context.severity) return context.severity;
    
    if (error instanceof TypeError || error instanceof ReferenceError) {
      return 'critical';
    }
    
    if (error.name === 'APIError' && error.status >= 500) {
      return 'high';
    }
    
    if (error.name === 'APIError' && error.status >= 400) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Generate user-friendly error message
   * @private
   */
  generateUserMessage(error, context) {
    if (context.userMessage) return context.userMessage;
    
    // API errors
    if (error.name === 'APIError') {
      if (error.status === 404) return 'İstenen kaynak bulunamadı';
      if (error.status === 403) return 'Bu işlem için yetkiniz bulunmuyor';
      if (error.status === 500) return 'Sunucu hatası oluştu';
      if (error.status >= 400) return 'İstek işlenirken hata oluştu';
    }
    
    // Network errors
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Bağlantı hatası oluştu';
    }
    
    // Module loading errors
    if (error.message.includes('import') || error.message.includes('module')) {
      return 'Sayfa yüklenirken hata oluştu';
    }
    
    // Generic error
    return 'Beklenmeyen bir hata oluştu';
  }

  /**
   * Generate unique error ID
   * @private
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log error to buffer
   * @private
   */
  logError(errorInfo) {
    this.logBuffer.push(errorInfo);
    
    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxLogSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxLogSize);
    }
    
    // Console logging with severity-based styling
    const logMethod = this.getLogMethod(errorInfo.severity);
    console[logMethod](`[${errorInfo.severity.toUpperCase()}] ${errorInfo.message}`, errorInfo);
  }

  /**
   * Get appropriate console method for severity
   * @private
   */
  getLogMethod(severity) {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warn';
      case 'low': return 'info';
      default: return 'log';
    }
  }

  /**
   * Show user feedback for error
   * @private
   */
  showUserFeedback(errorInfo) {
    const { severity, userMessage, id } = errorInfo;
    
    // Import toast system dynamically to avoid circular dependencies
    import('../components/Toast.js').then(({ showToast }) => {
      const toastType = severity === 'critical' || severity === 'high' ? 'error' : 'warning';
      showToast(userMessage, toastType);
    }).catch(() => {
      // Fallback if toast system unavailable
      console.warn('Toast system unavailable, error shown in console only');
    });
  }

  /**
   * Add error listener
   * @param {Function} listener - Error listener function
   */
  addErrorListener(listener) {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   * @param {Function} listener - Error listener function to remove
   */
  removeErrorListener(listener) {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * Notify all error listeners
   * @private
   */
  notifyListeners(errorInfo) {
    this.errorListeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  /**
   * Get error logs
   * @param {Object} filters - Filter options
   */
  getErrorLogs(filters = {}) {
    let logs = [...this.logBuffer];
    
    if (filters.severity) {
      logs = logs.filter(log => log.severity === filters.severity);
    }
    
    if (filters.since) {
      const since = new Date(filters.since);
      logs = logs.filter(log => new Date(log.timestamp) >= since);
    }
    
    if (filters.context) {
      logs = logs.filter(log => 
        log.context && log.context.type === filters.context
      );
    }
    
    return logs;
  }

  /**
   * Clear error logs
   */
  clearLogs() {
    this.logBuffer = [];
  }

  /**
   * Export error logs
   * @param {string} format - Export format ('json' or 'csv')
   */
  exportLogs(format = 'json') {
    const logs = this.getErrorLogs();
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }
    
    if (format === 'csv') {
      const headers = ['ID', 'Timestamp', 'Severity', 'Message', 'Context'];
      const rows = logs.map(log => [
        log.id,
        log.timestamp,
        log.severity,
        log.message.replace(/"/g, '""'),
        JSON.stringify(log.context).replace(/"/g, '""')
      ]);
      
      return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

/**
 * Async error wrapper utility
 * @param {Function} fn - Async function to wrap
 * @param {Object} context - Error context
 */
export const withErrorHandling = (fn, context = {}) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler.handleError(error, {
        ...context,
        functionName: fn.name,
        arguments: args
      });
      throw error; // Re-throw to allow caller to handle
    }
  };
};

/**
 * Try-catch wrapper with error handling
 * @param {Function} fn - Function to execute
 * @param {Object} context - Error context
 * @param {*} defaultValue - Default value to return on error
 */
export const tryCatch = async (fn, context = {}, defaultValue = null) => {
  try {
    return await fn();
  } catch (error) {
    errorHandler.handleError(error, {
      ...context,
      showToUser: false // Don't show to user by default for try-catch
    });
    return defaultValue;
  }
};

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message, field = null, value = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Form validation helper
 * @param {Object} data - Form data to validate
 * @param {Object} rules - Validation rules
 */
export const validateForm = (data, rules) => {
  const errors = [];
  
  Object.entries(rules).forEach(([field, rule]) => {
    const value = data[field];
    
    if (rule.required && (!value || value.toString().trim() === '')) {
      errors.push(new ValidationError(`${rule.label || field} is required`, field, value));
      return;
    }
    
    if (rule.type === 'number' && value && isNaN(Number(value))) {
      errors.push(new ValidationError(`${rule.label || field} must be a number`, field, value));
    }
    
    if (rule.min && value && Number(value) < rule.min) {
      errors.push(new ValidationError(`${rule.label || field} must be at least ${rule.min}`, field, value));
    }
    
    if (rule.max && value && Number(value) > rule.max) {
      errors.push(new ValidationError(`${rule.label || field} must be at most ${rule.max}`, field, value));
    }
    
    if (rule.pattern && value && !rule.pattern.test(value)) {
      errors.push(new ValidationError(`${rule.label || field} format is invalid`, field, value));
    }
  });
  
  if (errors.length > 0) {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.errors = errors;
    throw validationError;
  }
  
  return true;
};

export default errorHandler;