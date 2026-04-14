import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// JWT interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('staketracker_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('staketracker_token');
      localStorage.removeItem('staketracker_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ─── Companies ─────────────────────────────────────────────────────
export const companiesAPI = {
  list: (search = '') => api.get(`/companies${search ? `?search=${search}` : ''}`),
  get: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};

// ─── Stakeholders ──────────────────────────────────────────────────
export const stakeholdersAPI = {
  list: (companyId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/companies/${companyId}/stakeholders${query ? `?${query}` : ''}`);
  },
  create: (companyId, data) => api.post(`/companies/${companyId}/stakeholders`, data),
  update: (companyId, id, data) => api.put(`/companies/${companyId}/stakeholders/${id}`, data),
  delete: (companyId, id) => api.delete(`/companies/${companyId}/stakeholders/${id}`),
};

// ─── Change Log ────────────────────────────────────────────────────
export const changelogAPI = {
  byCompany: (companyId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/companies/${companyId}/changelog${query ? `?${query}` : ''}`);
  },
  global: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/changelog${query ? `?${query}` : ''}`);
  },
};

// ─── Scraping ──────────────────────────────────────────────────────
export const scrapeAPI = {
  trigger: (companyId) => api.post(`/companies/${companyId}/scrape`),
  jobs: (companyId) => api.get(`/companies/${companyId}/scrape/jobs`),
  jobDetail: (companyId, jobId) => api.get(`/companies/${companyId}/scrape/jobs/${jobId}`),
};

// ─── Export ────────────────────────────────────────────────────────
export const exportAPI = {
  company: (companyId) =>
    api.get(`/companies/${companyId}/export`, { responseType: 'blob' }),
  all: () => api.get('/export/all', { responseType: 'blob' }),
};

export default api;
