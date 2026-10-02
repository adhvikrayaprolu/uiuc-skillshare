import axios from 'axios';
import { isDemoSession } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
export const api = axios.create({baseURL: API_BASE_URL, withCredentials: true, xsrfCookieName: 'csrftoken', xsrfHeaderName: 'X-CSRFToken', headers: {'Content-Type': 'application/json'}});
let csrfPromise: Promise<void> | null = null;
export async function ensureCsrf() {
  if (!csrfPromise) csrfPromise = api.get('/auth/csrf/').then(() => undefined).catch((error) => {csrfPromise = null; throw error;});
  return csrfPromise;
}
api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes(config.method || 'get')) await ensureCsrf();
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && error.response?.data?.detail && !isDemoSession()) {
    window.dispatchEvent(new Event('skillshare:session-expired'));
  }
  return Promise.reject(error);
});
export function shouldUseMocks() {return USE_MOCKS || isDemoSession();}
export { API_BASE_URL };
