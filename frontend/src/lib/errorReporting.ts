import { api } from './api';

const MAX_REPORTS_PER_PAGE_LOAD = 10;
const sent = new Set<string>();

export const errorReportingEnabled = () => import.meta.env.VITE_ERROR_REPORTING !== 'false' && import.meta.env.MODE !== 'test';

function describe(error: unknown) {
  if (error instanceof Error) return { message: `${error.name}: ${error.message}`, source: (error.stack ?? '').split('\n').slice(1, 3).join(' ').trim() };
  return { message: String(error), source: '' };
}

export function reportError(error: unknown) {
  if (!errorReportingEnabled() || sent.size >= MAX_REPORTS_PER_PAGE_LOAD) return;
  const { message, source } = describe(error);
  const key = `${message}|${window.location.pathname}`;
  if (sent.has(key)) return;
  sent.add(key);
  void api.post('/client-errors/', {
    message: message.slice(0, 2000),
    source: source.slice(0, 2000),
    path: window.location.pathname,
    release: import.meta.env.VITE_RELEASE ?? 'local',
  }).catch(() => undefined);
}

export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => reportError(event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as { isAxiosError?: boolean } | undefined;
    if (reason?.isAxiosError) return;
    reportError(event.reason);
  });
}

export function resetErrorReportsForTests() {
  sent.clear();
}
