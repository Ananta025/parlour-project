import axios, { AxiosRequestConfig, CancelToken } from 'axios';

// Base API URL from environment variable with fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authorization token
api.interceptors.request.use(
  (config) => {
    // Add token to request headers if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
  async (error) => {
    // Handle unauthorized errors (expired token etc.)
    if (error.response && error.response.status === 401) {
      // Try token refresh if we have a refresh token
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !error.config._isRetry) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { token } = response.data;
          
          localStorage.setItem('token', token);
          
          // Retry the original request with new token
          error.config.headers.Authorization = `Bearer ${token}`;
          error.config._isRetry = true;
          return api(error.config);
        } catch (refreshError) {
          // If refresh fails, clear tokens and redirect
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userRole');
          
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } else {
        // No refresh token or already tried refresh, clear tokens
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        
        // Redirect to login page if we're in the browser
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper methods for common API operations
export const apiService = {
  // Authentication
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
  
  // Employees
  getEmployees: async (config?: AxiosRequestConfig) => {
    const response = await api.get('/employees', config);
    return response.data as Employee[];
  },
  
  getEmployee: async (id: string) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },
  
  createEmployee: async (data: any) => {
    const response = await api.post('/employees', data);
    return response.data;
  },
  
  updateEmployee: async (id: string, data: any) => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
  },
  
  deleteEmployee: async (id: string) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },
  
  // Tasks
  getTasks: async () => {
    const response = await api.get('/tasks');
    return response.data;
  },
  
  createTask: async (data: any) => {
    const response = await api.post('/tasks', data);
    return response.data;
  },
  
  updateTask: async (id: string, data: any) => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },
  
  deleteTask: async (id: string) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },
  
  updateTaskStatus: async (id: string, status: string) => {
    const response = await api.patch(`/tasks/${id}/status`, { status });
    return response.data;
  },
  
  // Attendance
  getAttendanceLogs: async () => {
    const response = await api.get('/attendance');
    return response.data;
  },
  
  recordAttendance: async (employeeId: string, type: 'check-in' | 'check-out') => {
    const response = await api.post('/attendance', { employeeId, type });
    return response.data;
  },
  
  // Dashboard data
  getDashboardStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
};

// Example interface for employee data
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  // other properties
}

// Export both the raw axios instance and the service
export default api;
