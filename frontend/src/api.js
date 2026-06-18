const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    // Check for 204 No Content
    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      // Extract detail message from FastAPI HTTP error response
      const errorMessage = data.detail || 'Something went wrong';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.detail = data.detail;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // System Stats
  getStats: () => request('/stats'),
  getHealth: () => request('/health'),

  // Products CRUD
  getProducts: () => request('/products/'),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (product) => request('/products/', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  updateProduct: (id, product) => request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  }),
  deleteProduct: (id) => request(`/products/${id}`, {
    method: 'DELETE',
  }),

  // Customers CRUD
  getCustomers: () => request('/customers/'),
  getCustomer: (id) => request(`/customers/${id}`),
  createCustomer: (customer) => request('/customers/', {
    method: 'POST',
    body: JSON.stringify(customer),
  }),
  updateCustomer: (id, customer) => request(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  }),
  deleteCustomer: (id) => request(`/customers/${id}`, {
    method: 'DELETE',
  }),

  // Orders CRUD
  getOrders: () => request('/orders/'),
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (order) => request('/orders/', {
    method: 'POST',
    body: JSON.stringify(order),
  }),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
};
