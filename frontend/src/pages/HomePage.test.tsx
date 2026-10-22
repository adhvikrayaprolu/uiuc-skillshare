import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import type { AttentionItem } from '../types/api';

const peer = (name: string) => ({ name, profile_id: 3 });
const items: AttentionItem[] = [
  { action: 'respond', request_id: 1, kind: 'swap', topic: 'Speech for pandas', skill: 'Data Analysis', peer: peer('Jordan Lee'), updated_at: '' },
  { action: 'respond', request_id: 2, kind: 'help', topic: 'Debugging', skill: 'Python', peer: peer('Aisha Rahman'), updated_at: '' },
];
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { firstName: 'Alex' } }) }));
vi.mock('../hooks/useDashboard', () => ({ useDashboard: () => ({ isLoading: false, isError: false, data: { attention_items: items, checklist: [] } }) }));
const swapState = vi.hoisted(() => ({ profiles: [] as unknown[] }));
const alex = { id: 1, name: 'Alex Rivera', major: 'CS', year: 'Junior', headline: 'Data', skills: [{ name: 'Python' }], swap: { they_teach_you: [{ id: 1, name: 'Python' }], you_can_teach: [{ id: 2, name: 'Figma' }] } };
vi.mock('../hooks/useRecommendedProfiles', () => ({ useRecommendedProfiles: () => ({ isLoading: false, isError: false, data: { profiles: [alex], matching: { recommendation_basis: 'learning_goals' } } }) }));
vi.mock('../hooks/useSwapMatches', () => ({ useSwapMatches: () => ({ isLoading: false, isError: false, data: { profiles: swapState.profiles } }) }));
vi.mock('../hooks/useProfileEditor', () => ({ useCurrentProfile: () => ({ data: { learning_goals: [1] } }) }));
vi.mock('../components/growth/InviteCard', () => ({ InviteCard: () => null }));
vi.mock('../components/growth/ColdStartPanel', () => ({ ColdStartPanel: () => null }));
afterEach(cleanup);

it('describes incoming swaps and help requests differently', () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  expect(screen.getByText('Jordan Lee').parentElement?.textContent).toBe('Jordan Lee proposed a swap for your Data Analysis');
  expect(screen.getByText('Aisha Rahman').parentElement?.textContent).toBe('Aisha Rahman asked for help with Python');
});

it('puts two-way swap matches above one-way suggestions without repeating them', () => {
  swapState.profiles = [alex];
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'You could swap with' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'See swap with Alex Rivera' })).toBeTruthy();
  expect(screen.getAllByText('Alex Rivera')).toHaveLength(1);
});

it('shows no swap section when there are no two-way matches', () => {
  swapState.profiles = [];
  render(<MemoryRouter><HomePage /></MemoryRouter>);
  expect(screen.queryByRole('heading', { name: 'You could swap with' })).toBeNull();
  expect(screen.getByText('Alex Rivera')).toBeTruthy();
});
