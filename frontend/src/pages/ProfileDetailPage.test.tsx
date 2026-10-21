import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileDetailPage } from './ProfileDetailPage';

const state = vi.hoisted(() => ({ isError: false }));
const cachedProfile = { id: 5, name: 'Priya Natarajan', major: 'Statistics', year: 'Junior', headline: 'Interview prep', bio: '', skills: [], availability: [], contacts: [], credentials: [], reviews: [], openToConnect: true };
vi.mock('../hooks/useProfile', () => ({
  // After a block, the refetch fails but TanStack Query keeps the previously loaded profile.
  useProfile: () => ({ isError: state.isError, data: { profile: cachedProfile, raw: {} } }),
  useSimilarProfiles: () => ({ isError: false, data: { profiles: [] } }),
  useContactClick: () => ({ mutate: vi.fn() }),
}));
vi.mock('../hooks/useHelpRequests', () => ({ useCreateHelpRequest: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock('../hooks/useSavedProfiles', () => ({ useSavedProfileActions: () => ({ savedProfileIds: new Set<number>(), toggleSaved: vi.fn() }) }));
vi.mock('../hooks/useTaxonomy', () => ({ useTaxonomy: () => ({ data: { rawSkills: [] } }) }));
vi.mock('../hooks/useProfileEditor', () => ({ useCurrentProfile: () => ({ data: { id: 1, profile_skills: [] } }) }));
vi.mock('../lib/interactionsApi', () => ({ getReviews: () => new Promise(() => {}), getEndorsements: () => new Promise(() => {}) }));
vi.mock('../components/ui/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
afterEach(cleanup);

const view = () => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={['/profiles/5']}><Routes><Route path="/profiles/:id" element={<ProfileDetailPage />} /></Routes></MemoryRouter>
  </QueryClientProvider>,
);

it('shows the profile while it loads successfully', () => {
  state.isError = false;
  view();
  expect(screen.getByRole('heading', { name: 'Priya Natarajan' })).toBeTruthy();
});

it('stops showing a cached profile once it can no longer be loaded', () => {
  state.isError = true;
  view();
  expect(screen.getByRole('heading', { name: 'Profile could not be loaded' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Priya Natarajan' })).toBeNull();
});
