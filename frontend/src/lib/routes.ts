export const APP_HOME = '/home';
export const SETUP_HOME = '/welcome';
export const SETUP_MATCHES = '/welcome/matches';
export const MY_PROFILE = '/me';
export const EDIT_PROFILE = '/me/edit';

export function safeDestination(path: string | undefined | null) {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null;
  if (path === '/' || path === '/login' || path.startsWith(SETUP_HOME)) return null;
  return path;
}
