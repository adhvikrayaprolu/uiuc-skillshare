import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MyProfilePage } from './MyProfilePage';

const state = vi.hoisted(() => ({ goalsPublic: true }));
vi.mock('../hooks/useProfileEditor', () => ({
  useCurrentProfile: () => ({ isLoading: false, isError: false, data: {
    display_name: 'Alex Rivera', major: 'CS', year: 'junior', headline: 'Data', bio: '', visibility: 'public', open_to_connect: true,
    profile_skills: [], learning_goals: [7], learning_goals_public: state.goalsPublic, credentials: [], availability: [],
  } }),
}));
vi.mock('../hooks/useTaxonomy', () => ({ useTaxonomy: () => ({ data: { rawSkills: [{ id: 7, name: 'Figma' }] } }) }));
afterEach(cleanup);

it('labels public learning goals as visible to members', () => {
  state.goalsPublic = true;
  render(<MemoryRouter><MyProfilePage /></MemoryRouter>);
  expect(screen.getByText('Shown on your profile')).toBeTruthy();
  expect(screen.queryByText('Only you')).toBeNull();
});

it('labels private learning goals as only visible to you', () => {
  state.goalsPublic = false;
  render(<MemoryRouter><MyProfilePage /></MemoryRouter>);
  expect(screen.getByText('Only you')).toBeTruthy();
});
