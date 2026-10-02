import { api, ensureCsrf } from './api';
import { clearAuth } from './auth';
import type { User } from '../types/api';

export async function loginWithGoogleIdToken(idToken: string) {
  await ensureCsrf();
  await api.post('/auth/google/', {provider: 'google', process: 'login', token: {client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, id_token: idToken}});
  clearAuth();
  return {user: await getCurrentUser()};
}
export async function requestEmailCode(email: string) {
  await ensureCsrf();
  try {await api.post('/auth/email/request/', {email});}
  catch (error) {if (!isPendingChallenge(error)) throw error;}
}
function isPendingChallenge(error: unknown) {
  const e = error as {response?: {status: number; data?: {data?: {flows?: {id: string; is_pending?: boolean}[]}}}};
  return e.response?.status === 401 && e.response.data?.data?.flows?.some((flow) => flow.id === 'login_by_code' && flow.is_pending);
}
export async function confirmEmailCode(code: string) {
  await api.post('/auth/email/confirm/', {code});
  clearAuth();
  return getCurrentUser();
}
export async function resendEmailCode() {await api.post('/auth/email/resend/');}
export async function logoutServer() {await api.post('/auth/logout/');}
export async function getCurrentUser() {return (await api.get<User>('/auth/me/')).data;}
