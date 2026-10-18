import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelpRequestsPage } from './HelpRequestsPage';
import type { HelpRequest, RequestBucket } from '../types/api';

const state = vi.hoisted(() => ({ rows: {} as Record<string, unknown[]>, error: false, refetch: vi.fn() }));
vi.mock('../hooks/useHelpRequests', () => ({
  useRequestBucket: (bucket: RequestBucket) => {
    const results = state.rows[bucket] ?? [];
    return { isLoading: false, isFetching: false, isError: state.error, refetch: state.refetch, data: { count: results.length, results } };
  },
}));

const swap = {
  id: 7, version: 1, seeker: 2, helper_profile: 1, my_role: 'helper', kind: 'swap', status: 'pending',
  topic: 'Figma for Python', message: 'Trade?', urgency: 'medium', created_at: '2026-10-01T10:00:00Z',
  seeker_display_name: 'Maya Chen', related_skill_name: 'Python', offered_skill_name: 'Figma',
} as HelpRequest;

beforeEach(() => { state.rows = {}; state.error = false; });
afterEach(cleanup);

it('lists what needs action with a direction, type and next step, linking to the request', () => {
  state.rows.needs_action = [swap];
  render(<MemoryRouter><HelpRequestsPage /></MemoryRouter>);
  expect(screen.getByRole('tab', { name: /Needs action/ }).getAttribute('aria-selected')).toBe('true');
  expect(screen.getByText('Received')).toBeTruthy();
  expect(screen.getByText('Swap')).toBeTruthy();
  expect(screen.getByText('Reply to Maya')).toBeTruthy();
  expect(screen.getByText(/You learn/).textContent).toContain('You learn Figma · You teach Python');
  expect(screen.getByRole('link', { name: 'Figma for Python' }).getAttribute('href')).toBe('/requests/7');
});

it('moves between tabs with the arrow keys and shows each empty state', async () => {
  render(<MemoryRouter><HelpRequestsPage /></MemoryRouter>);
  expect(screen.getByText("You're all caught up")).toBeTruthy();
  screen.getByRole('tab', { name: /Needs action/ }).focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement?.textContent).toBe('Active');
  expect(screen.getByText('Nothing in progress')).toBeTruthy();
  await userEvent.keyboard('{ArrowRight}');
  expect(screen.getByText('No past requests yet')).toBeTruthy();
});

it('offers a retry when the inbox fails to load', async () => {
  state.error = true;
  render(<MemoryRouter><HelpRequestsPage /></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(state.refetch).toHaveBeenCalled();
});
