/**
 * Modern Toast Notification System
 * Professional notification component with animations and auto-dismiss
 */

class ToastManager {
  constructor() {
    this.toasts = new Map();
    this.container = null;
    this.defaultDuration = 5000;
    this.maxToasts = 5;
    this.position = 'top-right';
    
    this.createContainer();
  }

  /**
   * Create toast container
   * @private
   */
  createContainer() {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'false');
    
    // Apply positioning styles
    this.applyContainerStyles();
    
    document.body.appendChild(this.container);
  }

  /**
   * Apply container styles
   * @private
   */
  applyContainerStyles() {
    const styles = {
      position: 'fixed',
      zIndex: '10000',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '16px'
    };

    // Position-specific styles
    const positionStyles = {
      'top-right': { top: '0', right: '0' },
      'top-left': { top: '0', left: '0' },
      'bottom-right': { bottom: '0', right: '0', flexDirection: 'column-reverse' },
      'bottom-left': { bottom: '0', left: '0', flexDirection: 'column-reverse' },
      'top-center': { top: '0', left: '50%', transform: 'translateX(-50%)' },
      'bottom-center': { bottom: '0', left: '50%', transform: 'translateX(-50%)', flexDirection: 'column-reverse' }
    };

    Object.assign(this.container.style, styles, positionStyles[this.position]);
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, warning, info)
   * @param {Object} options - Additional options
   */
  show(message, type = 'info', options = {}) {
    const toastId = this.generateId();
    const {
      duration = this.defaultDuration,
      persistent = false,
      actions = [],
      html = false,
      className = ''
    } = options;

    // Remove oldest toast if at max capacity
    if (this.toasts.size >= this.maxToasts) {
      const oldestId = this.toasts.keys().next().value;
      this.remove(oldestId);
    }

    const toast = this.createToastElement(toastId, message, type, {
      html,
      className,
      actions,
      persistent
    });

    this.container.appendChild(toast);
    this.toasts.set(toastId, {
      element: toast,
      type,
      message,
      timestamp: Date.now(),
      persistent
    });

    // Trigger entrance animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });

    // Auto-dismiss if not persistent
    if (!persistent && duration > 0) {
      setTimeout(() => {
        this.remove(toastId);
      }, duration);
    }

    return toastId;
  }

  /**
   * Create toast element
   * @private
   */
  createToastElement(id, message, type, options) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} ${options.className}`.trim();
    toast.dataset.toastId = id;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');
    
    // Apply base styles
    this.applyToastStyles(toast, type);

    const content = this.createToastContent(message, type, options);
    toast.appendChild(content);

    return toast;
  }

  /**
   * Apply toast styles
   * @private
   */
  applyToastStyles(toast, type) {
    const baseStyles = {
      pointerEvents: 'auto',
      padding: '12px 16px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      fontSize: '14px',
      lineHeight: '1.5',
      maxWidth: '400px',
      wordWrap: 'break-word',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      transform: 'translateX(100%)',
      opacity: '0',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    };

    const typeStyles = {
      success: {
        backgroundColor: '#10b981',
        color: '#ffffff',
        border: '1px solid #059669'
      },
      error: {
        backgroundColor: '#ef4444',
        color: '#ffffff',
        border: '1px solid #dc2626'
      },
      warning: {
        backgroundColor: '#f59e0b',
        color: '#ffffff',
        border: '1px solid #d97706'
      },
      info: {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: '1px solid #2563eb'
      }
    };

    Object.assign(toast.style, baseStyles, typeStyles[type]);
  }

  /**
   * Create toast content
   * @private
   */
  createToastContent(message, type, options) {
    const content = document.createElement('div');
    content.className = 'toast-content';
    content.style.cssText = 'flex: 1; display: flex; align-items: center; gap: 8px;';

    // Icon
    const icon = this.createIcon(type);
    content.appendChild(icon);

    // Message
    const messageEl = document.createElement('div');
    messageEl.className = 'toast-message';
    messageEl.style.cssText = 'flex: 1;';
    
    if (options.html) {
      messageEl.innerHTML = message;
    } else {
      messageEl.textContent = message;
    }
    content.appendChild(messageEl);

    // Actions
    if (options.actions && options.actions.length > 0) {
      const actionsEl = this.createActions(options.actions);
      content.appendChild(actionsEl);
    }

    // Close button (unless persistent)
    if (!options.persistent) {
      const closeBtn = this.createCloseButton();
      content.appendChild(closeBtn);
    }

    return content;
  }

  /**
   * Create icon element
   * @private
   */
  createIcon(type) {
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.style.cssText = 'flex-shrink: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;';

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    icon.textContent = icons[type] || icons.info;
    return icon;
  }

  /**
   * Create action buttons
   * @private
   */
  createActions(actions) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'toast-actions';
    actionsEl.style.cssText = 'display: flex; gap: 8px; margin-left: 8px;';

    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'toast-action-btn';
      btn.textContent = action.label;
      btn.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: inherit;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: background-color 0.2s;
      `;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        action.handler();
        
        if (action.dismissOnClick !== false) {
          this.remove(actionsEl.closest('.toast').dataset.toastId);
        }
      });

      btn.addEventListener('mouseover', () => {
        btn.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
      });

      btn.addEventListener('mouseout', () => {
        btn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      });

      actionsEl.appendChild(btn);
    });

    return actionsEl;
  }

  /**
   * Create close button
   * @private
   */
  createCloseButton() {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: inherit;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.2s;
      flex-shrink: 0;
    `;

    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.remove(closeBtn.closest('.toast').dataset.toastId);
    });

    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.opacity = '1';
    });

    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.opacity = '0.7';
    });

    return closeBtn;
  }

  /**
   * Remove toast
   * @param {string} toastId - Toast ID to remove
   */
  remove(toastId) {
    const toast = this.toasts.get(toastId);
    if (!toast) return;

    // Trigger exit animation
    toast.element.classList.add('toast-hide');
    toast.element.style.transform = 'translateX(100%)';
    toast.element.style.opacity = '0';

    // Remove after animation
    setTimeout(() => {
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      this.toasts.delete(toastId);
    }, 300);
  }

  /**
   * Remove all toasts
   */
  clear() {
    const toastIds = Array.from(this.toasts.keys());
    toastIds.forEach(id => this.remove(id));
  }

  /**
   * Update toast position
   * @param {string} position - New position
   */
  setPosition(position) {
    this.position = position;
    this.applyContainerStyles();
  }

  /**
   * Generate unique ID
   * @private
   */
  generateId() {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active toasts
   */
  getActiveToasts() {
    return Array.from(this.toasts.entries()).map(([id, toast]) => ({
      id,
      type: toast.type,
      message: toast.message,
      timestamp: toast.timestamp,
      persistent: toast.persistent
    }));
  }
}

// Singleton instance
const toastManager = new ToastManager();

// Add CSS animation classes
const style = document.createElement('style');
style.textContent = `
  .toast-show {
    transform: translateX(0) !important;
    opacity: 1 !important;
  }
  
  .toast-hide {
    transition: all 0.3s cubic-bezier(0.4, 0, 1, 0.5) !important;
  }
`;
document.head.appendChild(style);

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, warning, info)
 * @param {Object} options - Additional options
 */
export const showToast = (message, type = 'info', options = {}) => {
  return toastManager.show(message, type, options);
};

/**
 * Show success toast
 * @param {string} message - Toast message
 * @param {Object} options - Additional options
 */
export const showSuccess = (message, options = {}) => {
  return showToast(message, 'success', options);
};

/**
 * Show error toast
 * @param {string} message - Toast message
 * @param {Object} options - Additional options
 */
export const showError = (message, options = {}) => {
  return showToast(message, 'error', options);
};

/**
 * Show warning toast
 * @param {string} message - Toast message
 * @param {Object} options - Additional options
 */
export const showWarning = (message, options = {}) => {
  return showToast(message, 'warning', options);
};

/**
 * Show info toast
 * @param {string} message - Toast message
 * @param {Object} options - Additional options
 */
export const showInfo = (message, options = {}) => {
  return showToast(message, 'info', options);
};

/**
 * Remove specific toast
 * @param {string} toastId - Toast ID to remove
 */
export const removeToast = (toastId) => {
  toastManager.remove(toastId);
};

/**
 * Clear all toasts
 */
export const clearToasts = () => {
  toastManager.clear();
};

export { toastManager };
export default showToast;