import { expect, it, vi } from 'vitest';
import { getAllPages } from './pagination';
import { api } from './api';
vi.mock('./api', () => ({ api: { get: vi.fn() } }));
it('retains records beyond the first page without following an arbitrary next URL', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({ data: { results: [1, 2], next: 'https://untrusted.invalid/page' } }).mockResolvedValueOnce({ data: { results: [3], next: null } });
  expect(await getAllPages<number>('/help-requests/', { status: 'completed' })).toEqual([1, 2, 3]);
  expect(api.get).toHaveBeenLastCalledWith('/help-requests/', { params: { status: 'completed', page: 2 } });
});
