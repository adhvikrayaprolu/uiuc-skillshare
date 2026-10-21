import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DiscoveryPage } from './DiscoveryPage';
import { ToastProvider } from '../components/ui/ToastProvider';

const state = vi.hoisted(() => ({ pages: [] as (number | undefined)[], queries: [] as (string | undefined)[] }));
vi.mock('../hooks/useDiscoverySearch', () => ({
  useDiscoverySearch: (params: { page?: number; q?: string }) => {
    state.pages.push(params.page);
    state.queries.push(params.q);
    return { isLoading: false, isFetching: false, isError: false, refetch: vi.fn(), data: { count: 40, profiles: [], next: '/api/discovery/search/?page=9', isMock: false } };
  },
}));
vi.mock('../hooks/useTaxonomy', () => ({ useTaxonomy: () => ({ data: { categories: [], skills: [] } }) }));
vi.mock('../components/growth/ColdStartPanel', () => ({ ColdStartPanel: () => null }));
vi.mock('../hooks/useSavedProfiles', () => ({ useSavedProfileActions: () => ({ savedProfileIds: new Set<number>(), toggleSaved: vi.fn() }) }));

beforeEach(() => { vi.useFakeTimers(); state.pages = []; state.queries = []; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const renderDiscover = (url = '/discover') => render(<MemoryRouter initialEntries={[url]}><ToastProvider><DiscoveryPage /></ToastProvider></MemoryRouter>);

it('keeps the chosen page when the initial search debounce settles', () => {
  renderDiscover('/discover?q=React');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getByText('Page 2')).toBeTruthy();
  act(() => { vi.advanceTimersByTime(1000); });
  expect(screen.getByText('Page 2')).toBeTruthy();
  expect(state.pages.at(-1)).toBe(2);
});

it('returns to page 1 once a new search settles', () => {
  renderDiscover();
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Search helpers' }), { target: { value: 'Figma' } });
  expect(screen.getByText('Page 2')).toBeTruthy();
  act(() => { vi.advanceTimersByTime(300); });
  expect(screen.getByText('Page 1')).toBeTruthy();
  expect(state.queries.at(-1)).toBe('Figma');
  expect(state.pages.at(-1)).toBe(1);
});
