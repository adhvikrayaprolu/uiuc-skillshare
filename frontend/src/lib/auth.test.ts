import {beforeEach, expect, it} from 'vitest';
import {clearAuth, legacyAuthKeys} from './auth';
beforeEach(() => localStorage.clear());
it('removes token and mock-demo state left by older builds', () => {
  legacyAuthKeys.forEach((key) => localStorage.setItem(key, 'stale'));
  localStorage.setItem('unrelated', 'kept');
  clearAuth();
  expect(legacyAuthKeys.map((key) => localStorage.getItem(key))).toEqual([null, null, null]);
  expect(localStorage.getItem('unrelated')).toBe('kept');
});
