import { formatDate } from './requests';

/** "Just now", "45m ago", "3h ago", "2d ago", then the date. */
export function relativeTime(value: string, now = Date.now()) {
  const then = Date.parse(value);
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d ago`;
  return formatDate(value);
}
