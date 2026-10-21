import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {UserMenuDropdown} from './UserMenuDropdown';

afterEach(cleanup);

it('keeps staff analytics out of a regular member menu', () => {
  render(<MemoryRouter><UserMenuDropdown userName="Sam" onLogout={() => {}} /></MemoryRouter>);
  expect(screen.getByRole('link', {name: 'Saved profiles'})).toBeTruthy();
  expect(screen.getByRole('link', {name: 'Settings'})).toBeTruthy();
  expect(screen.queryByRole('link', {name: 'Analytics'})).toBeNull();
});

it('shows analytics to staff and closes after navigation', async () => {
  const onNavigate = vi.fn();
  render(<MemoryRouter><UserMenuDropdown userName="Admin" isStaff onNavigate={onNavigate} onLogout={() => {}} /></MemoryRouter>);
  await userEvent.click(screen.getByRole('link', {name: 'Analytics'}));
  expect(onNavigate).toHaveBeenCalled();
});
