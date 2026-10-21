import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ColdStartPanel } from './ColdStartPanel';
import { InviteCard } from './InviteCard';
import { inviteMessage, inviteUrl } from '../../lib/invite';

const state = vi.hoisted(() => ({ hints: { isLoading: false, data: undefined as unknown }, profile: undefined as unknown }));
vi.mock('../../hooks/useCommunityHints', () => ({ useCommunityHints: () => state.hints }));
vi.mock('../../hooks/useProfileEditor', () => ({ useCurrentProfile: () => ({ data: state.profile }) }));

const show = (onPickSkill?: (name: string) => void) => render(<MemoryRouter><ColdStartPanel onPickSkill={onPickSkill} /></MemoryRouter>);

beforeEach(() => {
  state.hints = { isLoading: false, data: { member_count: 3, popular: [{ id: 1, name: 'Python', teachers: 4 }], unmet: [{ id: 2, name: 'Figma', learners: 3 }, { id: 5, name: 'Guitar', learners: 1 }], my_untaught_goals: [{ id: 9, name: 'Welding' }] } };
  state.profile = { profile_skills: [{ id: 1, skill: 5 }], skill_alerts_enabled: true };
});
afterEach(cleanup);

it('invites members to be the first teacher, skipping skills they already teach', () => {
  show();
  expect(screen.getByRole('heading', { name: 'Be the first to teach Figma' })).toBeTruthy();
  expect(screen.getByText(/3 learners/)).toBeTruthy();
  expect(screen.queryByText(/Guitar/)).toBeNull();
  expect(screen.getByRole('link', { name: 'Add a skill you can teach' }).getAttribute('href')).toBe('/me/edit?tab=teaching');
});

it('links popular skills to a search, or hands them to the page when it can search in place', async () => {
  show();
  expect(screen.getByRole('link', { name: /Python/ }).getAttribute('href')).toBe('/discover?q=Python');
  cleanup();
  const pick = vi.fn();
  show(pick);
  await userEvent.click(screen.getByRole('button', { name: /Python/ }));
  expect(pick).toHaveBeenCalledWith('Python');
});

it('tailors the invite to an untaught goal and only promises alerts when they are on', () => {
  show();
  expect(screen.getByRole('heading', { name: 'Know someone who teaches Welding?' })).toBeTruthy();
  expect(screen.getByText(/let you know when someone who teaches it joins/)).toBeTruthy();
  cleanup();
  state.profile = { profile_skills: [], skill_alerts_enabled: false };
  show();
  expect(screen.queryByText(/let you know/)).toBeNull();
});

it('still offers an invite while hints load or when there are none', () => {
  state.hints = { isLoading: true, data: undefined };
  show();
  expect(screen.getByText(/Looking at what people here teach/).getAttribute('role')).toBe('status');
  expect(screen.getByRole('button', { name: 'Copy invite link' })).toBeTruthy();
});

const stubClipboard = (writeText: ReturnType<typeof vi.fn>) => Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

it('copies the invite link and falls back to selecting it when the clipboard is blocked', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  stubClipboard(writeText);
  render(<InviteCard />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(inviteUrl()));
  expect(await screen.findByText('Invite link copied to your clipboard.')).toBeTruthy();
  cleanup();
  stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
  render(<InviteCard />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));
  expect(await screen.findByText(/Copying is blocked here/)).toBeTruthy();
  expect(screen.getByRole('link', { name: /Text a friend/ }).getAttribute('href')).toBe(`sms:?&body=${encodeURIComponent(inviteMessage(inviteUrl()))}`);
});
