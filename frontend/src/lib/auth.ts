const ACCESS_TOKEN_KEY = 'illini_skillswap_access_token';
const REFRESH_TOKEN_KEY = 'illini_skillswap_refresh_token';
const DEMO_USER_KEY = 'illini_skillswap_demo_user';

export interface DemoUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  hasCompletedOnboarding: boolean;
  isStudentVerified: boolean;
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearAuth() {
  clearTokens();
  localStorage.removeItem(DEMO_USER_KEY);
}

/** Clear mock demo user without removing API tokens (call before storing JWT from dev/Google login). */
export function clearDemoUser() {
  localStorage.removeItem(DEMO_USER_KEY);
}

export function startDemoSession() {
  const demoUser: DemoUser = {
    id: 1,
    email: 'sample@example.invalid',
    firstName: 'Synthetic',
    lastName: 'Demo',
    hasCompletedOnboarding: true,
    isStudentVerified: false,
  };

  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
  return demoUser;
}

export function getDemoUser(): DemoUser | null {
  const rawUser = localStorage.getItem(DEMO_USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as DemoUser;
  } catch {
    localStorage.removeItem(DEMO_USER_KEY);
    return null;
  }
}

export function isDemoSession() {
  return Boolean(getDemoUser());
}

export function logout() {
  clearAuth();
}

export const authStorageKeys = {
  access: ACCESS_TOKEN_KEY,
  refresh: REFRESH_TOKEN_KEY,
  demoUser: DEMO_USER_KEY,
};
