export const APP_HOME = '/dashboard';
export const SETUP_HOME = '/onboarding';

export function safeDestination(path: string | undefined | null) {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null;
  if (path === '/' || path === '/login') return null;
  return path;
}
