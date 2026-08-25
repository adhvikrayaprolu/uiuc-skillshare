import { api } from './api';
import { clearDemoUser, setTokens } from './auth';
import type { AuthResponse, User } from '../types/api';

const DEFAULT_DEV_DEMO_EMAIL = 'adhvik.rayaprolu@illinois.edu';

export async function loginWithGoogleIdToken(idToken: string) {
  const { data } = await api.post<AuthResponse>('/auth/google/', { id_token: idToken });
  clearDemoUser();
  setTokens(data.access, data.refresh);
  return data;
}

/** Local DEBUG-only login; same JWT shape as Google. */
export async function loginWithDevEmail(email: string = DEFAULT_DEV_DEMO_EMAIL) {
  const { data } = await api.post<AuthResponse>('/auth/dev-login/', { email });
  clearDemoUser();
  setTokens(data.access, data.refresh);
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get<User>('/auth/me/');
  return data;
}
