import axios from 'axios';

// Create base axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const session = localStorage.getItem('session');
    if (session) {
      config.headers['X-Session-ID'] = session;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Unauthorized - clear session and redirect to login
      localStorage.removeItem('user');
      localStorage.removeItem('session');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Customer API
export const customersApi = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Weigh Tickets API
export const weighTicketsApi = {
  getAll: (params) => api.get('/weigh-tickets', { params }),
  getById: (id) => api.get(`/weigh-tickets/${id}`),
  create: (data) => api.post('/weigh-tickets', data),
  update: (id, data) => api.put(`/weigh-tickets/${id}`, data),
  delete: (id) => api.delete(`/weigh-tickets/${id}`),
};

// Settings API
export const settingsApi = {
  getDeviceId: () => api.get('/device-id'),
};

export default api; 