import { expect, it } from 'vitest';
import { relativeTime } from './time';

const now = Date.parse('2026-10-21T18:00:00Z');
it('describes recent times the way people say them', () => {
  expect(relativeTime('2026-10-21T17:59:40Z', now)).toBe('Just now');
  expect(relativeTime('2026-10-21T17:15:00Z', now)).toBe('45m ago');
  expect(relativeTime('2026-10-21T15:00:00Z', now)).toBe('3h ago');
  expect(relativeTime('2026-10-19T18:00:00Z', now)).toBe('2d ago');
});
it('falls back to the date after a week and tolerates bad input', () => {
  expect(relativeTime('2026-10-01T18:00:00Z', now)).toMatch(/2026/);
  expect(relativeTime('not a date', now)).toBe('');
});
