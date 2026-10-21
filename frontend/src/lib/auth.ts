// Sessions live in server cookies. These keys belonged to the retired token and mock-demo modes;
// signing in or out removes any copies an older build left in the browser.
const LEGACY_KEYS = ['illini_skillswap_access_token', 'illini_skillswap_refresh_token', 'illini_skillswap_demo_user'];

export interface SessionUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  hasCompletedOnboarding: boolean;
  isStudentVerified: boolean;
  isStaff?: boolean;
}

export function clearAuth() {
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
}

export const legacyAuthKeys = LEGACY_KEYS;
