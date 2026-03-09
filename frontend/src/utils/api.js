import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAdminToken = () => localStorage.getItem('token');
const getCustomerToken = () => localStorage.getItem('customerToken');

const withBearer = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

const getScopedToken = (url = '') => {
  const adminToken = getAdminToken();
  const customerToken = getCustomerToken();

  if (
    url === '/auth/login' ||
    url === '/auth/register' ||
    url === '/customer/login' ||
    url === '/customer/register'
  ) {
    return null;
  }

  if (url.startsWith('/customer/me') || url.startsWith('/customer/change-password')) {
    return customerToken;
  }

  if (url.startsWith('/orders/my') || url === '/orders' || url.startsWith('/recommendations/my')) {
    return customerToken;
  }

  if (url.startsWith('/admin/') || url.startsWith('/auth/me') || url.startsWith('/auth/password')) {
    return adminToken;
  }

  if (url === '/dishes' || (url.startsWith('/dishes/') && !url.startsWith('/dishes/active'))) {
    return adminToken;
  }

  return customerToken || adminToken;
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = getScopedToken(config.url || '');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';

      if (
        requestUrl === '/auth/login' ||
        requestUrl === '/customer/login' ||
        requestUrl === '/auth/register' ||
        requestUrl === '/customer/register'
      ) {
        return Promise.reject(error);
      }

      if (requestUrl.startsWith('/admin/') || requestUrl.startsWith('/auth/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('admin');
      } else if (requestUrl.startsWith('/customer/') || requestUrl.startsWith('/orders/my') || requestUrl.startsWith('/recommendations/my')) {
        localStorage.removeItem('customerToken');
      }
      
      // Return error to be handled by caller
      // Components will handle the redirect
    }
    return Promise.reject(error);
  }
);

export default api;

// API methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data, { headers: withBearer(getAdminToken()) }),
  getMe: () => api.get('/auth/me', { headers: withBearer(getAdminToken()) }),
  changePassword: (data) => api.put('/auth/password', data, { headers: withBearer(getAdminToken()) })
};

export const customerAPI = {
  register: (data) => api.post('/customer/register', data),
  login: (credentials) => api.post('/customer/login', credentials),
  getMe: () => api.get('/customer/me', { headers: withBearer(getCustomerToken()) }),
  changePassword: (data) => api.put('/customer/change-password', data, { headers: withBearer(getCustomerToken()) })
};

export const dishAPI = {
  getActive: (params) => api.get('/dishes/active', { params }),
  getAll: (params) => api.get('/dishes', { params }),
  getById: (id) => api.get(`/dishes/${id}`),
  create: (data) => api.post('/dishes', data),
  update: (id, data) => api.put(`/dishes/${id}`, data),
  delete: (id) => api.delete(`/dishes/${id}`),
  toggle: (id) => api.patch(`/dishes/${id}/toggle`),
  uploadImage: (formData) => api.post('/dishes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export const reviewAPI = {
  create: (data) => api.post('/reviews', data, { headers: withBearer(getCustomerToken()) }),
  getAll: (params) => api.get('/reviews', { params, headers: withBearer(getAdminToken()) }),
  getByCustomer: () => api.get('/reviews/customer/my-reviews', { headers: withBearer(getCustomerToken()) }),
  getPublic: (params) => api.get('/reviews/public', { params }),
  getByDish: (dishId) => api.get(`/reviews/dish/${dishId}`),
  getById: (id) => api.get(`/reviews/${id}`),
  toggleVisibility: (id) => api.patch(`/reviews/${id}/visibility`, {}, { headers: withBearer(getAdminToken()) }),
  delete: (id) => api.delete(`/reviews/${id}`, { headers: withBearer(getAdminToken()) })
};

export const adminAPI = {
  getDashboard: (params) => api.get('/admin/dashboard', { params }),
  getSentimentTrends: (params) => api.get('/admin/sentiment-trends', { params }),
  getDishAnalytics: (dishId) => api.get(`/admin/dish-analytics/${dishId}`)
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data)
};

export const orderAPI = {
  place: (data) => api.post('/orders', data, { headers: withBearer(getCustomerToken()) }),
  getMyOrders: () => api.get('/orders/my', { headers: withBearer(getCustomerToken()) }),
  getMyOrderById: (orderId) => api.get(`/orders/my/${orderId}`, { headers: withBearer(getCustomerToken()) }),
  cancelMyOrder: (orderId) => api.patch(`/orders/my/${orderId}/cancel`, {}, { headers: withBearer(getCustomerToken()) }),
  getAllOrders: (params) => api.get('/orders', { params, headers: withBearer(getAdminToken()) }),
  updateOrderStatus: (orderId, data) => api.patch(`/orders/${orderId}/status`, data, { headers: withBearer(getAdminToken()) }),
  getOrderStats: () => api.get('/orders/stats', { headers: withBearer(getAdminToken()) })
};

export const recommendationAPI = {
  getMyRecommendations: () => api.get('/recommendations/my', { headers: withBearer(getCustomerToken()) }),
  getPopular: () => api.get('/recommendations/popular')
};
