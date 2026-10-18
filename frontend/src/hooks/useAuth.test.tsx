import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {cleanup, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {AuthProvider, useAuth} from './useAuth';

const api = vi.hoisted(() => ({getCurrentUser: vi.fn(), logoutServer: vi.fn(), confirmEmailCode: vi.fn(), loginWithGoogleIdToken: vi.fn()}));
vi.mock('../lib/authApi', () => api);
const alice = {id: 1, email: 'alice@illinois.edu', first_name: 'Alice', last_name: '', is_student_verified: true, has_completed_onboarding: true};
function Probe() {
  const auth = useAuth();
  return <><p>{auth.isLoading ? 'Restoring' : auth.user?.email || 'Anonymous'}</p><button onClick={() => void auth.logout()}>Sign out</button><button onClick={() => void auth.confirmEmailCode('fixture')}>Switch account</button></>;
}
function view(client: QueryClient) {render(<QueryClientProvider client={client}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);}
beforeEach(() => {localStorage.clear(); vi.resetAllMocks(); api.getCurrentUser.mockResolvedValue(alice); api.logoutServer.mockResolvedValue(undefined);});
afterEach(cleanup);
it('restores only the server session and removes legacy browser tokens', async () => {
  localStorage.setItem('illini_skillswap_access_token', 'stale');
  api.getCurrentUser.mockRejectedValue(new Error('expired'));
  view(new QueryClient());
  await screen.findByText('Anonymous');
  expect(localStorage.length).toBe(0);
});
it('revokes the server session and clears account-specific cached data', async () => {
  const client = new QueryClient(); view(client); await screen.findByText(alice.email);
  client.setQueryData(['private-profile'], {secret: 'Alice data'});
  await userEvent.click(screen.getByRole('button', {name: 'Sign out'}));
  await screen.findByText('Anonymous');
  expect(api.logoutServer).toHaveBeenCalledOnce();
  expect(client.getQueryData(['private-profile'])).toBeUndefined();
});
it('clears the old account cache before showing another account', async () => {
  const client = new QueryClient(); view(client); await screen.findByText(alice.email);
  client.setQueryData(['private-profile'], {secret: 'Alice data'});
  api.confirmEmailCode.mockResolvedValue({...alice, id: 2, email: 'bob@illinois.edu'});
  await userEvent.click(screen.getByRole('button', {name: 'Switch account'}));
  await screen.findByText('bob@illinois.edu');
  expect(client.getQueryData(['private-profile'])).toBeUndefined();
});
it('clears account data when the server session expires', async () => {
  const client = new QueryClient(); view(client); await screen.findByText(alice.email);
  client.setQueryData(['private-profile'], {secret: 'Alice data'});
  window.dispatchEvent(new Event('skillshare:session-expired'));
  await waitFor(() => expect(screen.getByText('Anonymous')).toBeTruthy());
  expect(client.getQueryData(['private-profile'])).toBeUndefined();
});
