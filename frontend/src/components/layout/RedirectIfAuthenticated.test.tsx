import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {RedirectIfAuthenticated} from './RedirectIfAuthenticated';

const state = vi.hoisted(() => ({auth: {isLoading: false, isAuthenticated: false, hasCompletedOnboarding: true as boolean | null}}));
vi.mock('../../hooks/useAuth', () => ({useAuth: () => state.auth}));

function view(entry: string | {pathname: string; state: unknown} = '/') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<RedirectIfAuthenticated />}>
          <Route path="/" element={<p>Marketing page</p>} />
          <Route path="/login" element={<p>Sign-in form</p>} />
        </Route>
        <Route path="/home" element={<p>Member home</p>} />
        <Route path="/welcome" element={<p>Setup</p>} />
        <Route path="/requests" element={<p>Requests</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {state.auth = {isLoading: false, isAuthenticated: false, hasCompletedOnboarding: true};});
afterEach(cleanup);

it('shows the landing page to signed-out visitors', () => {view(); expect(screen.getByText('Marketing page')).toBeTruthy();});
it('sends signed-in members from the landing page to their home', () => {state.auth.isAuthenticated = true; view(); expect(screen.getByText('Member home')).toBeTruthy();});
it('sends members with an unfinished profile to setup', () => {state.auth.isAuthenticated = true; state.auth.hasCompletedOnboarding = false; view('/login'); expect(screen.getByText('Setup')).toBeTruthy();});
it('honours a safe deep link saved by the sign-in redirect', () => {state.auth.isAuthenticated = true; view({pathname: '/login', state: {from: '/requests'}}); expect(screen.getByText('Requests')).toBeTruthy();});
it('ignores protocol-relative destinations', () => {state.auth.isAuthenticated = true; view({pathname: '/login', state: {from: '//evil.example'}}); expect(screen.getByText('Member home')).toBeTruthy();});
