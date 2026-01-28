// src/api/apiClient.ts
import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    // ✅ NO fijar Content-Type globalmente (rompe FormData)
    Accept: 'application/json',
  },
});

// ✅ Interceptor: si es FormData, asegúrate de NO mandar Content-Type fijo
apiClient.interceptors.request.use((config) => {
  const isFormData =
    typeof FormData !== 'undefined' && config.data instanceof FormData;

  if (isFormData) {
    // axios pondrá multipart/form-data con boundary automáticamente
    if (config.headers) {
      delete (config.headers as any)['Content-Type'];
      delete (config.headers as any)['content-type'];
    }
  } else {
    // Para JSON normal, sí seteamos Content-Type si no viene seteado
    if (config.data !== undefined) {
      config.headers = config.headers ?? {};
      if (!(config.headers as any)['Content-Type'] && !(config.headers as any)['content-type']) {
        (config.headers as any)['Content-Type'] = 'application/json';
      }
    }
  }

  return config;
});

export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem('connyvet_token', token);
  } else {
    delete apiClient.defaults.headers.common.Authorization;
    localStorage.removeItem('connyvet_token');
  }
}

export function initAuthTokenFromStorage() {
  const token = localStorage.getItem('connyvet_token');
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
}
