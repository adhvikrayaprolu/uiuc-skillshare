import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WelcomeMatchesPage } from './WelcomeMatchesPage';
import type { Profile } from '../types/profile';

const person = (id: number, name: string, swap = false) => ({
  id, name, major: 'CS', year: 'Junior', headline: `${name} headline`, skills: [], openToConnect: true,
  swap: swap ? { they_teach_you: [{ id: 1, name: 'Python' }], you_can_teach: [{ id: 2, name: 'Figma' }] } : null,
}) as unknown as Profile;
const state = vi.hoisted(() => ({ swaps: [] as Profile[], helpers: [] as Profile[] }));
vi.mock('../hooks/useSwapMatches', () => ({ useSwapMatches: () => ({ isLoading: false, isError: false, data: { profiles: state.swaps } }) }));
vi.mock('../hooks/useRecommendedProfiles', () => ({ useRecommendedProfiles: () => ({ isLoading: false, isError: false, refetch: vi.fn(), data: { profiles: state.helpers, matching: { recommendation_basis: 'learning_goals' } } }) }));
vi.mock('../hooks/useProfileEditor', () => ({ useCurrentProfile: () => ({ data: { display_name: 'Jamie Ortiz', learning_goals: [1] } }) }));
vi.mock('../hooks/useTaxonomy', () => ({ useTaxonomy: () => ({ data: { rawSkills: [{ id: 1, name: 'Python' }] } }) }));
vi.mock('../components/growth/ColdStartPanel', () => ({ ColdStartPanel: () => <p>Cold start</p> }));
beforeEach(() => { state.swaps = []; state.helpers = []; });
afterEach(cleanup);

const view = () => render(<MemoryRouter><WelcomeMatchesPage /></MemoryRouter>);

it('leads with two-way swap matches and does not repeat them as helpers', () => {
  state.swaps = [person(1, 'Alex Rivera', true)];
  state.helpers = [person(1, 'Alex Rivera'), person(2, 'Mei Chen')];
  view();
  const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
  expect(headings).toEqual(['You could swap with', 'More people who teach what you want to learn']);
  expect(screen.getByRole('link', { name: 'See swap with Alex Rivera' })).toBeTruthy();
  expect(screen.getAllByText('Alex Rivera')).toHaveLength(1);
  expect(screen.getByText('Mei Chen')).toBeTruthy();
});

it('shows helpers when there are no swap matches', () => {
  state.helpers = [person(2, 'Mei Chen')];
  view();
  expect(screen.getByRole('heading', { name: 'Teaches what you want to learn' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'You could swap with' })).toBeNull();
});

it('keeps the cold-start help when nobody matches yet', () => {
  view();
  expect(screen.getByText("You're early")).toBeTruthy();
  expect(screen.getByText('Cold start')).toBeTruthy();
});
