import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

const state = vi.hoisted(() => ({ inbox: null as string | null }));
vi.mock('../hooks/useAuthConfig', () => ({ useAuthConfig: () => ({ data: { csrfToken: 't', googleEnabled: false, demoEnabled: false, localInboxUrl: state.inbox, authenticated: false } }) }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ confirmEmailCode: vi.fn(), loginWithGoogleIdToken: vi.fn() }) }));
vi.mock('../components/ui/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../lib/authApi', () => ({ requestEmailCode: vi.fn().mockResolvedValue(undefined), resendEmailCode: vi.fn() }));
beforeEach(() => { state.inbox = null; });
afterEach(cleanup);

async function askForCode() {
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
  await userEvent.type(screen.getByLabelText('Illinois email'), 'jamie@illinois.edu');
  await userEvent.click(screen.getByRole('button', { name: 'Send email code' }));
  await screen.findByLabelText('Email code');
}

it('points local developers to the test inbox for their code', async () => {
  state.inbox = 'http://localhost:8025';
  await askForCode();
  expect(screen.getByRole('link', { name: 'test inbox' }).getAttribute('href')).toBe('http://localhost:8025');
});

it('says nothing about a test inbox when the server does not offer one', async () => {
  await askForCode();
  expect(screen.queryByRole('link', { name: 'test inbox' })).toBeNull();
});
