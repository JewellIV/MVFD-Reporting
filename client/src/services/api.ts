import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }).then(res => res.data),
  
  register: (userData: any) =>
    api.post('/auth/register', userData).then(res => res.data),
  
  getCurrentUser: () =>
    api.get('/auth/me').then(res => res.data),
  
  updateProfile: (userData: any) =>
    api.put('/auth/profile', userData).then(res => res.data),
};

export const nemsisAPI = {
  getRecords: (params?: any) =>
    api.get('/nemsis', { params }).then(res => res.data),
  
  getRecord: (id: string) =>
    api.get(`/nemsis/${id}`).then(res => res.data),
  
  createRecord: (data: any) =>
    api.post('/nemsis', data).then(res => res.data),
  
  updateRecord: (id: string, data: any) =>
    api.put(`/nemsis/${id}`, data).then(res => res.data),
  
  deleteRecord: (id: string) =>
    api.delete(`/nemsis/${id}`).then(res => res.data),
  
  submitRecord: (id: string) =>
    api.post(`/nemsis/${id}/submit`).then(res => res.data),
  
  reviewRecord: (id: string, action: string, comments?: string) =>
    api.post(`/nemsis/${id}/review`, { action, comments }).then(res => res.data),
  
  exportRecords: (format: string, params?: any) =>
    api.get(`/nemsis/export/${format}`, { params }).then(res => res.data),
};

export const nfirsAPI = {
  getRecords: (params?: any) =>
    api.get('/nfirs', { params }).then(res => res.data),
  
  getRecord: (id: string) =>
    api.get(`/nfirs/${id}`).then(res => res.data),
  
  createRecord: (data: any) =>
    api.post('/nfirs', data).then(res => res.data),
  
  updateRecord: (id: string, data: any) =>
    api.put(`/nfirs/${id}`, data).then(res => res.data),
  
  deleteRecord: (id: string) =>
    api.delete(`/nfirs/${id}`).then(res => res.data),
  
  submitRecord: (id: string) =>
    api.post(`/nfirs/${id}/submit`).then(res => res.data),
  
  reviewRecord: (id: string, action: string, comments?: string) =>
    api.post(`/nfirs/${id}/review`, { action, comments }).then(res => res.data),
  
  getStats: (params?: any) =>
    api.get('/nfirs/stats/overview', { params }).then(res => res.data),
  
  exportRecords: (format: string, params?: any) =>
    api.get(`/nfirs/export/${format}`, { params }).then(res => res.data),
};

export const epcrsAPI = {
  getOfflineRecords: () =>
    api.get('/epcrs/offline').then(res => res.data),
  
  createOfflineRecord: (data: any) =>
    api.post('/epcrs/offline', data).then(res => res.data),
  
  syncRecords: (recordIds: string[]) =>
    api.post('/epcrs/sync', { recordIds }).then(res => res.data),
  
  syncAllRecords: () =>
    api.post('/epcrs/sync/all').then(res => res.data),
  
  getSyncStatus: () =>
    api.get('/epcrs/sync/status').then(res => res.data),
};

export const cadAPI = {
  syncIncidents: (dateRange: any) =>
    api.post('/cad/sync/incidents', dateRange).then(res => res.data),
  
  syncFireIncidents: (dateRange: any) =>
    api.post('/cad/sync/fire-incidents', dateRange).then(res => res.data),
  
  getStatus: () =>
    api.get('/cad/status').then(res => res.data),
  
  manualSync: (syncType: string, dateRange: any) =>
    api.post('/cad/sync/manual', { syncType, dateRange }).then(res => res.data),
};

export const googleAPI = {
  getAuthUrl: () =>
    api.get('/google/auth/url').then(res => res.data),
  
  syncRoster: (spreadsheetId: string, sheetName?: string) =>
    api.post('/google/sync/roster', { spreadsheetId, sheetName }).then(res => res.data),
  
  exportRoster: (spreadsheetId: string, sheetName?: string) =>
    api.post('/google/export/roster', { spreadsheetId, sheetName }).then(res => res.data),
  
  syncIncidents: (spreadsheetId: string, recordType: string, sheetName?: string) =>
    api.post('/google/sync/incidents', { spreadsheetId, recordType, sheetName }).then(res => res.data),
};

export const uploadAPI = {
  uploadToVirginia: (type: string, data: any) =>
    api.post(`/upload/virginia/${type}`, data).then(res => res.data),
  
  uploadToFederal: (type: string, data: any) =>
    api.post(`/upload/federal/${type}`, data).then(res => res.data),
  
  getUploadStatus: () =>
    api.get('/upload/status').then(res => res.data),
};

export const rosterAPI = {
  getMembers: (params?: any) =>
    api.get('/roster', { params }).then(res => res.data),
  
  getMember: (id: string) =>
    api.get(`/roster/${id}`).then(res => res.data),
  
  createMember: (data: any) =>
    api.post('/roster', data).then(res => res.data),
  
  updateMember: (id: string, data: any) =>
    api.put(`/roster/${id}`, data).then(res => res.data),
  
  deactivateMember: (id: string) =>
    api.put(`/roster/${id}/deactivate`).then(res => res.data),
  
  reactivateMember: (id: string) =>
    api.put(`/roster/${id}/reactivate`).then(res => res.data),
  
  deleteMember: (id: string) =>
    api.delete(`/roster/${id}`).then(res => res.data),
  
  getStats: () =>
    api.get('/roster/stats/overview').then(res => res.data),
  
  exportCSV: () =>
    api.get('/roster/export/csv').then(res => res.data),
};

export default api;