import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {SettingsPage} from './SettingsPage';

const state = vi.hoisted(() => ({api: {get: vi.fn(), post: vi.fn(), delete: vi.fn()}, update: vi.fn(), refresh: vi.fn(), logout: vi.fn()}));
vi.mock('../lib/api', () => ({api: state.api}));
vi.mock('../hooks/useAuth', () => ({useAuth: () => ({user: {email: 'owner@illinois.edu'}, refreshSession: state.refresh, logout: state.logout})}));
vi.mock('../hooks/useProfileEditor', () => ({useCurrentProfile: () => ({data: {visibility: 'public', share_contacts: false}, isLoading: false}), useProfileEditor: () => ({updateProfile: {mutateAsync: state.update}})}));
vi.mock('../components/ui/ToastProvider', () => ({useToast: () => ({success: vi.fn()})}));
function view() {render(<QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}><MemoryRouter><Routes><Route path="/" element={<SettingsPage/>}/><Route path="/login" element={<p>Signed out</p>}/><Route path="/profile/edit" element={<p>Edit section</p>}/></Routes></MemoryRouter></QueryClientProvider>);}
beforeEach(() => {vi.resetAllMocks(); state.api.get.mockResolvedValue({data: {results: [{id: 7, blocked_label: 'Blocked peer'}], next: null}});});
afterEach(cleanup);
it('requires exact account confirmation and retains the account on failed deletion', async () => {
  state.api.post.mockRejectedValue({response: {data: {detail: 'Deletion unavailable'}}}); view();
  const button = screen.getByRole('button', {name: 'Delete my account permanently'});
  expect((button as HTMLButtonElement).disabled).toBe(true);
  await userEvent.type(screen.getByLabelText('Type your email to confirm permanent deletion'), 'owner@illinois.edu');
  await userEvent.click(button);
  expect(state.api.post).toHaveBeenCalledWith('/auth/delete/', {confirmation: 'owner@illinois.edu'});
  await screen.findByRole('alert');
  expect(state.refresh).not.toHaveBeenCalled();
});
it('revokes local account state after confirmed server deletion', async () => {
  state.api.post.mockResolvedValue({data: {success: true}}); state.refresh.mockResolvedValue(null); view();
  await userEvent.type(screen.getByLabelText('Type your email to confirm permanent deletion'), 'owner@illinois.edu');
  await userEvent.click(screen.getByRole('button', {name: 'Delete my account permanently'}));
  await screen.findByText('Signed out'); expect(state.refresh).toHaveBeenCalledOnce();
});
it('loads actual blocks and keeps failures visible when unblocking fails', async () => {
  state.api.delete.mockRejectedValue({response: {data: {detail: 'Try later'}}}); view();
  await userEvent.click(await screen.findByRole('button', {name: 'Unblock Blocked peer'}));
  await screen.findByRole('alert');
  expect(screen.queryByText('No blocked users.')).toBeNull();
});

it('shows a pending privacy choice immediately and restores it when saving fails', async () => {
  let rejectSave: (reason: unknown) => void = () => undefined;
  state.update.mockImplementation(() => new Promise((_resolve,reject) => {rejectSave=reject;}));
  view();
  const publish=screen.getByLabelText('Published for eligible signed-in members') as HTMLInputElement;
  await userEvent.click(publish);
  expect(publish.checked).toBe(false);
  expect(publish.disabled).toBe(true);
  rejectSave({response:{data:{detail:'Could not save preference'}}});
  await screen.findByRole('alert');
  expect(publish.checked).toBe(true);
});
