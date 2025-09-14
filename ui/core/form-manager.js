/**
 * Merkezi Form Yöneticisi
 * Form handling, validation, submit ve reset işlemlerini standardize eder
 */

import { showToast, showFormErrors, clearFormErrors } from '../helpers.js';
import { UI_CONFIG } from '../../config/app-config.js';
import { getValidationEngine } from './validation-engine.js';

export class FormManager {
  /**
   * Static factory method for creating form managers
   */
  static createForm(formElement, config = {}) {
    return new FormManager(formElement, config);
  }

  constructor(formElement, config = {}) {
    this.form = formElement;
    this.config = {
      // Default config
      autoValidate: true,
      validationDelay: UI_CONFIG.FORM.VALIDATION_DELAY,
      autoSave: false,
      autoSaveDelay: UI_CONFIG.FORM.AUTO_SAVE_DELAY,
      resetAfterSubmit: true,
      showToastOnSuccess: true,
      showToastOnError: true,
      
      // Override with user config
      ...config
    };
    
    this.validators = config.validators || {};
    this.onSubmit = config.onSubmit || config.submitHandler || null;
    this.onReset = config.onReset || null;
    this.onValidate = config.onValidate || null;
    
    // API client opsiyonel - sadece gerektiğinde kullan
    this.apiClient = config.apiClient || null;
    
    // State
    this.isSubmitting = false;
    this.validationTimeout = null;
    this.autoSaveTimeout = null;
    
    // Event handlers
    this.boundHandlers = {
      submit: this.handleSubmit.bind(this),
      reset: this.handleReset.bind(this),
      input: this.handleInput.bind(this)
    };
    
    this.init();
  }

  /**
   * Form'u initialize et
   */
  init() {
    if (!this.form) {
      throw new Error('Form element is required');
    }

    // Event listeners ekle
    this.form.addEventListener('submit', this.boundHandlers.submit);
    
    // Reset button varsa bağla
    const resetBtn = this.form.querySelector('[type="reset"], [data-action="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', this.boundHandlers.reset);
    }

    // Auto-validation için input listeners
    if (this.config.autoValidate) {
      this.form.addEventListener('input', this.boundHandlers.input);
      this.form.addEventListener('change', this.boundHandlers.input);
    }

    console.log('✅ FormManager initialized for form:', this.form.id || 'unnamed');
  }

  /**
   * Submit handler
   */
  async handleSubmit(event) {
    event.preventDefault();
    
    if (this.isSubmitting) {
      console.warn('⚠️ Form is already being submitted');
      return;
    }

    try {
      this.isSubmitting = true;
      this.setSubmitButtonState(true, 'Kaydediliyor...');
      
      // Form verilerini al
      const formData = this.getFormData();
      
      // Validation
      const validationResult = await this.validateForm(formData);
      if (!validationResult.isValid) {
        showFormErrors(this.form, validationResult.errors);
        if (this.config.showToastOnError) {
          showToast('Form hatalarını düzeltin', 'error');
        }
        return;
      }

      // Clear previous errors
      clearFormErrors(this.form);

      // Custom submit handler varsa çağır
      if (this.onSubmit) {
        const result = await this.onSubmit(formData, this);
        
        if (result === false) {
          return; // Submission cancelled
        }
        
        if (result && result.success === false) {
          if (this.config.showToastOnError) {
            showToast(result.message || 'Kaydetme hatası', 'error');
          }
          return;
        }
      }

      // Success handling
      if (this.config.showToastOnSuccess) {
        showToast('Başarıyla kaydedildi', 'success');
      }

      if (this.config.resetAfterSubmit) {
        this.resetForm();
      }

    } catch (error) {
      console.error('❌ Form submit error:', error);
      if (this.config.showToastOnError) {
        showToast('Kaydetme hatası: ' + error.message, 'error');
      }
    } finally {
      this.isSubmitting = false;
      this.setSubmitButtonState(false, 'Kaydet');
    }
  }

  /**
   * Reset handler
   */
  handleReset(event) {
    event.preventDefault();
    this.resetForm();
  }

  /**
   * Input handler (auto-validation için)
   */
  handleInput(event) {
    if (!this.config.autoValidate) return;

    // Debounce validation
    clearTimeout(this.validationTimeout);
    this.validationTimeout = setTimeout(() => {
      this.validateField(event.target);
    }, this.config.validationDelay);

    // Auto-save
    if (this.config.autoSave) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = setTimeout(() => {
        this.autoSave();
      }, this.config.autoSaveDelay);
    }
  }

  /**
   * Form verilerini al
   */
  getFormData() {
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData.entries());
    
    // Checkbox'lar için özel handling
    this.form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      if (!data.hasOwnProperty(checkbox.name)) {
        data[checkbox.name] = checkbox.checked;
      }
    });

    return data;
  }

  /**
   * Form'u validate et
   */
  async validateForm(data = null) {
    const formData = data || this.getFormData();
    const errors = [];

    // Schema-based validation (ValidationEngine)
    if (this.config.validation && this.config.validation.schema) {
      const validationEngine = getValidationEngine();
      const schemaResult = await validationEngine.validateWithSchema(
        this.config.validation.schema, 
        formData
      );
      
      if (!schemaResult.isValid) {
        errors.push(...schemaResult.errors.map(err => ({
          field: err.field,
          msg: err.message
        })));
      }
    }

    // Built-in validation (HTML5)
    if (!this.form.checkValidity()) {
      const invalidElements = this.form.querySelectorAll(':invalid');
      invalidElements.forEach(element => {
        errors.push({
          field: element.name,
          msg: element.validationMessage
        });
      });
    }

    // Custom validators
    for (const [fieldName, validator] of Object.entries(this.validators)) {
      const value = formData[fieldName];
      const result = await validator(value, formData);
      
      if (result !== true) {
        errors.push({
          field: fieldName,
          msg: typeof result === 'string' ? result : `${fieldName} geçersiz`
        });
      }
    }

    // Custom validation handler
    if (this.onValidate) {
      const customResult = await this.onValidate(formData);
      if (customResult && customResult.errors) {
        errors.push(...customResult.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Tek field validate et
   */
  async validateField(fieldElement) {
    const fieldName = fieldElement.name;
    const fieldValue = fieldElement.value;
    
    // Clear previous error for this field
    clearFormErrors(this.form);
    
    if (this.validators[fieldName]) {
      const result = await this.validators[fieldName](fieldValue, this.getFormData());
      
      if (result !== true) {
        showFormErrors(this.form, [{
          field: fieldName,
          msg: typeof result === 'string' ? result : `${fieldName} geçersiz`
        }]);
      }
    }
  }

  /**
   * Form'u reset et
   */
  resetForm() {
    this.form.reset();
    clearFormErrors(this.form);
    
    // Custom reset handler
    if (this.onReset) {
      this.onReset(this);
    }

    console.log('🔄 Form reset completed');
  }

  /**
   * Reset alias for convenience
   */
  reset() {
    return this.resetForm();
  }

  /**
   * Submit button state'ini değiştir
   */
  setSubmitButtonState(isLoading, text = null) {
    const submitBtn = this.form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      if (text) {
        submitBtn.textContent = text;
      }
    }
  }

  /**
   * Auto-save işlemi
   */
  async autoSave() {
    if (this.isSubmitting) return;

    try {
      const formData = this.getFormData();
      const validationResult = await this.validateForm(formData);
      
      if (validationResult.isValid && this.config.autoSaveHandler) {
        await this.config.autoSaveHandler(formData);
        console.log('💾 Auto-save completed');
      }
    } catch (error) {
      console.error('❌ Auto-save error:', error);
    }
  }

  /**
   * Validator ekle
   */
  addValidator(fieldName, validator) {
    this.validators[fieldName] = validator;
  }

  /**
   * Form'u temizle ve yok et
   */
  destroy() {
    // Event listeners temizle
    this.form.removeEventListener('submit', this.boundHandlers.submit);
    this.form.removeEventListener('input', this.boundHandlers.input);
    this.form.removeEventListener('change', this.boundHandlers.input);
    
    const resetBtn = this.form.querySelector('[type="reset"], [data-action="reset"]');
    if (resetBtn) {
      resetBtn.removeEventListener('click', this.boundHandlers.reset);
    }

    // Timeout'ları temizle
    clearTimeout(this.validationTimeout);
    clearTimeout(this.autoSaveTimeout);

    console.log('🗑️ FormManager destroyed');
  }
}

/**
 * Common validators
 */
export const CommonValidators = {
  required: (value) => {
    return value && value.toString().trim() !== '' ? true : 'Bu alan zorunludur';
  },

  email: (value) => {
    if (!value) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? true : 'Geçerli bir email adresi giriniz';
  },

  minLength: (min) => (value) => {
    if (!value) return true; // Optional field
    return value.length >= min ? true : `En az ${min} karakter olmalıdır`;
  },

  maxLength: (max) => (value) => {
    if (!value) return true; // Optional field
    return value.length <= max ? true : `En fazla ${max} karakter olabilir`;
  },

  productCode: (value) => {
    if (!value) return 'Ürün kodu zorunludur';
    const cleaned = value.toString().trim().toUpperCase();
    if (cleaned.length < 3) return 'Ürün kodu en az 3 karakter olmalıdır';
    if (!/^[A-Z0-9]+$/.test(cleaned)) return 'Ürün kodu sadece harf ve rakam içerebilir';
    return true;
  },

  operationCode: (value) => {
    if (!value) return 'Operasyon kodu zorunludur';
    const cleaned = value.toString().trim().toUpperCase();
    if (cleaned.length > 10) return 'Operasyon kodu en fazla 10 karakter olabilir';
    if (!/^[A-Z0-9]+$/.test(cleaned)) return 'Operasyon kodu sadece harf ve rakam içerebilir';
    return true;
  }
};

/**
 * Form factory functions
 */
export const FormFactory = {
  /**
   * Product form oluştur
   */
  createProductForm: (formElement, config = {}) => {
    return new FormManager(formElement, {
      validators: {
        productCode: CommonValidators.productCode,
        name: CommonValidators.required,
        type: CommonValidators.required
      },
      ...config
    });
  },

  /**
   * Operation form oluştur
   */
  createOperationForm: (formElement, config = {}) => {
    return new FormManager(formElement, {
      validators: {
        operasyonKodu: CommonValidators.operationCode,
        operasyonAdi: CommonValidators.required
      },
      ...config
    });
  }
};

// Default export
export default FormManager;