// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://localhost:7287',
  
  // Endpoints
  ENDPOINTS: {
    // Operations
    OPERATIONS: '/api/Operations',
    OPERATIONS_ENTRY: '/api/Operations/entry',
    OPERATIONS_ACTIVATE: (id) => `/api/Operations/${id}/activate`,
    OPERATIONS_DEACTIVATE: (id) => `/api/Operations/${id}/deactivate`,
    OPERATIONS_UPDATE: (id) => `/api/Operations/${id}`,

    // Other modules (for future use)
    URETIM: '/api/uretim',
    PAKETLEME: '/api/paketleme',
    URUN: '/api/urun',
    SIPARIS: '/api/siparis'
  },
  
  // Helper method to build full URL
  getUrl: (endpoint, params = {}) => {
    let url = API_CONFIG.BASE_URL + endpoint;
    
    // Add query parameters if provided
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += '?' + searchParams.toString();
    }
    
    return url;
  },
  
  // Common request options
  getRequestOptions: (method = 'GET', body = null) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    return options;
  }
};