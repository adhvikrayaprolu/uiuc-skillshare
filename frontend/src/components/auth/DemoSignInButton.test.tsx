import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { DemoSignInButton } from './DemoSignInButton';

const state = vi.hoisted(() => ({ demoEnabled: true, loginDemo: vi.fn(), error: vi.fn() }));
vi.mock('../../hooks/useAuthConfig', () => ({ useAuthConfig: () => ({ data: { csrfToken: 't', googleEnabled: false, demoEnabled: state.demoEnabled } }) }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ loginDemo: state.loginDemo }) }));
vi.mock('../ui/ToastProvider', () => ({ useToast: () => ({ error: state.error }) }));

beforeEach(() => { state.demoEnabled = true; state.loginDemo = vi.fn().mockResolvedValue({}); state.error = vi.fn(); });
afterEach(cleanup);

function RedirectTarget() {
  const location = useLocation();
  return <p>Redirect target: {(location.state as { from?: string } | null)?.from ?? 'none'}</p>;
}

const renderButton = (account?: 'staff') => render(
  <MemoryRouter initialEntries={['/login']}>
    <Routes>
      <Route path="/login" element={<><DemoSignInButton account={account} className="">Try the demo</DemoSignInButton><RedirectTarget /></>} />
      <Route path="/home" element={<p>Home screen</p>} />
      <Route path="/analytics" element={<p>Launch metrics screen</p>} />
    </Routes>
  </MemoryRouter>,
);

it('is absent when the server does not offer demo sign-in', () => {
  state.demoEnabled = false;
  renderButton();
  expect(screen.queryByRole('button', { name: 'Try the demo' })).toBeNull();
});

it('signs in to the demo member and opens Home', async () => {
  renderButton();
  await userEvent.click(screen.getByRole('button', { name: 'Try the demo' }));
  expect(state.loginDemo).toHaveBeenCalledWith(undefined);
  expect(await screen.findByText('Home screen')).toBeTruthy();
});

it('opens launch metrics for the demo moderator', async () => {
  renderButton('staff');
  await userEvent.click(screen.getByRole('button', { name: 'Try the demo' }));
  expect(state.loginDemo).toHaveBeenCalledWith('staff');
  expect(await screen.findByText('Launch metrics screen')).toBeTruthy();
});

it('explains a missing demo seed instead of failing silently', async () => {
  state.loginDemo = vi.fn().mockRejectedValue(new Error('503'));
  renderButton();
  await userEvent.click(screen.getByRole('button', { name: 'Try the demo' }));
  expect(state.error).toHaveBeenCalledWith('The demo account is not available. Run make dev to seed it.');
  expect(screen.getByRole('button', { name: 'Try the demo' })).toBeTruthy();
});

it('tells the signed-in redirect where to go before the session starts', async () => {
  state.loginDemo = vi.fn(() => new Promise(() => {}));
  renderButton('staff');
  await userEvent.click(screen.getByRole('button', { name: 'Try the demo' }));
  expect(screen.getByText('Redirect target: /analytics')).toBeTruthy();
});
