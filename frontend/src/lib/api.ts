import axios from 'axios';
import { clearTokens, getAccessToken, getRefreshToken, isDemoSession, setTokens } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh || isDemoSession() || shouldUseMocks()) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ access: string }>(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
      .then((response) => {
        setTokens(response.data.access, refresh);
        return response.data.access;
      })
      .catch(() => {
        clearTokens();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const access = await refreshAccessToken();
      if (access) {
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  },
);

export function shouldUseMocks() {
  return USE_MOCKS;
}

export { API_BASE_URL };
