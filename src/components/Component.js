/**
 * Modern Component Base Class
 * Professional component architecture with lifecycle management
 */

class Component {
  constructor(container, options = {}) {
    this.container = container;
    this.options = { ...this.getDefaultOptions(), ...options };
    this.state = {};
    this.listeners = [];
    this.refs = new Map();
    this.mounted = false;
    this.destroyed = false;
    
    // Bind methods to preserve context
    this.mount = this.mount.bind(this);
    this.unmount = this.unmount.bind(this);
    this.update = this.update.bind(this);
    this.setState = this.setState.bind(this);
  }

  /**
   * Get default component options
   * Override in subclasses
   */
  getDefaultOptions() {
    return {};
  }

  /**
   * Get initial component state
   * Override in subclasses
   */
  getInitialState() {
    return {};
  }

  /**
   * Component lifecycle: before mount
   * Override in subclasses
   */
  beforeMount() {
    // Override in subclasses
  }

  /**
   * Mount component to container
   */
  async mount() {
    if (this.mounted || this.destroyed) return;
    
    try {
      this.state = { ...this.getInitialState() };
      await this.beforeMount();
      
      this.render();
      this.bindEvents();
      
      this.mounted = true;
      await this.afterMount();
      
    } catch (error) {
      console.error('Error mounting component:', error);
      throw error;
    }
  }

  /**
   * Component lifecycle: after mount
   * Override in subclasses
   */
  async afterMount() {
    // Override in subclasses
  }

  /**
   * Render component HTML
   * Override in subclasses
   */
  render() {
    // Override in subclasses
    this.container.innerHTML = '<div>Component placeholder</div>';
  }

  /**
   * Bind event listeners
   * Override in subclasses
   */
  bindEvents() {
    // Override in subclasses
  }

  /**
   * Update component state
   * @param {Object|Function} newState - New state or state updater function
   */
  setState(newState) {
    if (this.destroyed) return;
    
    const prevState = { ...this.state };
    
    if (typeof newState === 'function') {
      this.state = { ...this.state, ...newState(this.state) };
    } else {
      this.state = { ...this.state, ...newState };
    }
    
    this.onStateChange(this.state, prevState);
  }

  /**
   * Handle state changes
   * Override in subclasses
   * @param {Object} newState - New state
   * @param {Object} prevState - Previous state
   */
  onStateChange(newState, prevState) {
    // Override in subclasses
  }

  /**
   * Update component (re-render)
   */
  update() {
    if (!this.mounted || this.destroyed) return;
    
    try {
      this.beforeUpdate();
      this.render();
      this.afterUpdate();
    } catch (error) {
      console.error('Error updating component:', error);
    }
  }

  /**
   * Component lifecycle: before update
   * Override in subclasses
   */
  beforeUpdate() {
    // Override in subclasses
  }

  /**
   * Component lifecycle: after update
   * Override in subclasses
   */
  afterUpdate() {
    // Override in subclasses
  }

  /**
   * Component lifecycle: before unmount
   * Override in subclasses
   */
  beforeUnmount() {
    // Override in subclasses
  }

  /**
   * Unmount component
   */
  async unmount() {
    if (!this.mounted || this.destroyed) return;
    
    try {
      await this.beforeUnmount();
      this.unbindEvents();
      this.clearRefs();
      
      if (this.container) {
        this.container.innerHTML = '';
      }
      
      this.mounted = false;
      await this.afterUnmount();
      
    } catch (error) {
      console.error('Error unmounting component:', error);
    }
  }

  /**
   * Component lifecycle: after unmount
   * Override in subclasses
   */
  async afterUnmount() {
    // Override in subclasses
  }

  /**
   * Destroy component (cleanup all resources)
   */
  destroy() {
    if (this.destroyed) return;
    
    if (this.mounted) {
      this.unmount();
    }
    
    this.destroyed = true;
    this.container = null;
    this.options = null;
    this.state = null;
    this.listeners = [];
    this.refs.clear();
  }

  /**
   * Add event listener with automatic cleanup
   * @param {Element} element - Element to add listener to
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   */
  addEventListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    this.listeners.push({ element, event, handler, options });
  }

  /**
   * Remove all event listeners
   */
  unbindEvents() {
    this.listeners.forEach(({ element, event, handler, options }) => {
      try {
        element.removeEventListener(event, handler, options);
      } catch (error) {
        console.warn('Failed to remove event listener:', error);
      }
    });
    this.listeners = [];
  }

  /**
   * Create element reference
   * @param {string} name - Reference name
   * @param {string} selector - CSS selector
   */
  createRef(name, selector) {
    const element = this.container.querySelector(selector);
    if (element) {
      this.refs.set(name, element);
    }
    return element;
  }

  /**
   * Get element reference
   * @param {string} name - Reference name
   */
  getRef(name) {
    return this.refs.get(name);
  }

  /**
   * Clear all references
   */
  clearRefs() {
    this.refs.clear();
  }

  /**
   * Find element within component
   * @param {string} selector - CSS selector
   */
  find(selector) {
    return this.container ? this.container.querySelector(selector) : null;
  }

  /**
   * Find all elements within component
   * @param {string} selector - CSS selector
   */
  findAll(selector) {
    return this.container ? Array.from(this.container.querySelectorAll(selector)) : [];
  }

  /**
   * Emit custom event
   * @param {string} eventName - Event name
   * @param {*} detail - Event detail
   */
  emit(eventName, detail = null) {
    if (!this.container) return;
    
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });
    
    this.container.dispatchEvent(event);
  }

  /**
   * Create HTML template
   * @param {string} template - HTML template string
   * @param {Object} data - Template data
   */
  template(template, data = {}) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  /**
   * Sanitize HTML content
   * @param {string} html - HTML content
   */
  sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  /**
   * Add CSS class with animation support
   * @param {Element} element - Target element
   * @param {string} className - CSS class name
   * @param {number} duration - Animation duration
   */
  addClass(element, className, duration = 0) {
    element.classList.add(className);
    
    if (duration > 0) {
      setTimeout(() => {
        element.classList.remove(className);
      }, duration);
    }
  }

  /**
   * Get component option
   * @param {string} key - Option key
   * @param {*} defaultValue - Default value
   */
  getOption(key, defaultValue = undefined) {
    return this.options[key] !== undefined ? this.options[key] : defaultValue;
  }

  /**
   * Set component option
   * @param {string} key - Option key
   * @param {*} value - Option value
   */
  setOption(key, value) {
    this.options[key] = value;
  }

  /**
   * Check if component is mounted
   */
  isMounted() {
    return this.mounted && !this.destroyed;
  }

  /**
   * Check if component is destroyed
   */
  isDestroyed() {
    return this.destroyed;
  }
}

/**
 * Form Component Base Class
 */
class FormComponent extends Component {
  constructor(container, options = {}) {
    super(container, options);
    this.formData = {};
    this.errors = {};
    this.validationRules = {};
  }

  getDefaultOptions() {
    return {
      autoValidate: true,
      validateOnChange: true,
      resetOnSubmit: false
    };
  }

  /**
   * Get form data
   */
  getFormData() {
    const form = this.find('form');
    if (!form) return this.formData;
    
    const data = {};
    const formData = new FormData(form);
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  }

  /**
   * Set form data
   * @param {Object} data - Form data
   */
  setFormData(data) {
    this.formData = { ...data };
    
    Object.entries(data).forEach(([key, value]) => {
      const input = this.find(`[name="${key}"]`);
      if (input) {
        input.value = value;
      }
    });
  }

  /**
   * Validate form
   * @param {Object} data - Data to validate
   */
  validate(data = null) {
    const formData = data || this.getFormData();
    const errors = {};
    
    Object.entries(this.validationRules).forEach(([field, rules]) => {
      const value = formData[field];
      const fieldErrors = this.validateField(field, value, rules);
      
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    });
    
    this.errors = errors;
    return Object.keys(errors).length === 0;
  }

  /**
   * Validate single field
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @param {Array} rules - Validation rules
   */
  validateField(field, value, rules) {
    const errors = [];
    
    rules.forEach(rule => {
      if (typeof rule === 'function') {
        const result = rule(value, field);
        if (result !== true) {
          errors.push(result);
        }
      }
    });
    
    return errors;
  }

  /**
   * Show form errors
   */
  showErrors() {
    // Clear previous errors
    this.clearErrors();
    
    Object.entries(this.errors).forEach(([field, fieldErrors]) => {
      const input = this.find(`[name="${field}"]`);
      if (input) {
        input.classList.add('error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = fieldErrors[0];
        
        input.parentNode.appendChild(errorDiv);
      }
    });
  }

  /**
   * Clear form errors
   */
  clearErrors() {
    this.findAll('.field-error').forEach(el => el.remove());
    this.findAll('.error').forEach(el => el.classList.remove('error'));
  }

  /**
   * Reset form
   */
  resetForm() {
    const form = this.find('form');
    if (form) {
      form.reset();
    }
    
    this.formData = {};
    this.errors = {};
    this.clearErrors();
  }
}

/**
 * Table Component Base Class
 */
class TableComponent extends Component {
  constructor(container, options = {}) {
    super(container, options);
    this.data = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.sortField = null;
    this.sortDirection = 'asc';
  }

  getDefaultOptions() {
    return {
      pageSize: 20,
      sortable: true,
      filterable: true,
      paginated: true,
      columns: []
    };
  }

  /**
   * Set table data
   * @param {Array} data - Table data
   */
  setData(data) {
    this.data = [...data];
    this.filteredData = [...data];
    this.currentPage = 1;
    this.update();
  }

  /**
   * Filter table data
   * @param {string} query - Filter query
   */
  filter(query) {
    if (!query) {
      this.filteredData = [...this.data];
    } else {
      this.filteredData = this.data.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(query.toLowerCase())
        )
      );
    }
    
    this.currentPage = 1;
    this.update();
  }

  /**
   * Sort table data
   * @param {string} field - Field to sort by
   * @param {string} direction - Sort direction ('asc' or 'desc')
   */
  sort(field, direction = null) {
    if (direction === null) {
      direction = this.sortField === field && this.sortDirection === 'asc' ? 'desc' : 'asc';
    }
    
    this.sortField = field;
    this.sortDirection = direction;
    
    this.filteredData.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    this.update();
  }

  /**
   * Go to specific page
   * @param {number} page - Page number
   */
  goToPage(page) {
    const maxPage = Math.ceil(this.filteredData.length / this.getOption('pageSize'));
    this.currentPage = Math.max(1, Math.min(page, maxPage));
    this.update();
  }

  /**
   * Get current page data
   */
  getCurrentPageData() {
    if (!this.getOption('paginated')) {
      return this.filteredData;
    }
    
    const pageSize = this.getOption('pageSize');
    const start = (this.currentPage - 1) * pageSize;
    const end = start + pageSize;
    
    return this.filteredData.slice(start, end);
  }
}

export { Component, FormComponent, TableComponent };
export default Component;