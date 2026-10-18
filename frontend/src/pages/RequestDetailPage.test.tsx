import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequestDetailPage } from './RequestDetailPage';
import type { HelpRequest } from '../types/api';

const state = vi.hoisted(() => ({
  request: null as unknown, error: null as unknown, mutateAsync: vi.fn(), success: vi.fn(), createReview: vi.fn(), createEndorsement: vi.fn(),
}));
vi.mock('../hooks/useHelpRequests', () => ({
  useHelpRequest: () => ({ isLoading: false, isError: Boolean(state.error), error: state.error, data: state.request, refetch: vi.fn() }),
  useUpdateHelpRequest: () => ({ mutateAsync: state.mutateAsync, isPending: false }),
}));
vi.mock('../components/ui/ToastProvider', () => ({ useToast: () => ({ success: state.success, error: vi.fn() }) }));
vi.mock('../lib/interactionsApi', () => ({ createReview: state.createReview, createEndorsement: state.createEndorsement }));

const base = {
  id: 9, version: 3, seeker: 2, helper_profile: 1, kind: 'swap', topic: 'Figma for Python', message: 'Trade?', urgency: 'medium',
  created_at: '2026-10-01T10:00:00Z', seeker_display_name: 'Maya Chen', seeker_profile_id: 4, helper_display_name: 'Me',
  related_skill_name: 'Python', offered_skill_name: 'Figma', feedback: null,
};
const show = (overrides: Partial<HelpRequest>) => {
  state.request = { ...base, ...overrides };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/requests/9']}><Routes><Route path="/requests/:id" element={<RequestDetailPage />} /></Routes></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => { vi.resetAllMocks(); state.error = null; });
afterEach(cleanup);

it('lets the receiver accept with a reply and the current version', async () => {
  state.mutateAsync.mockResolvedValue({});
  show({ my_role: 'helper', status: 'pending' });
  expect(screen.getByRole('heading', { name: 'Reply to Maya' })).toBeTruthy();
  await userEvent.type(screen.getByRole('textbox', { name: /Reply/ }), 'Tuesday works');
  await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
  expect(state.mutateAsync).toHaveBeenCalledWith({ id: 9, payload: { version: 3, status: 'accepted', response_message: 'Tuesday works' } });
  await waitFor(() => expect(state.success).toHaveBeenCalledWith('Swap accepted.'));
});

it('keeps the actions and explains a conflict when the request changed', async () => {
  state.mutateAsync.mockRejectedValue({ response: { status: 409 } });
  show({ my_role: 'helper', status: 'pending' });
  await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
  expect((await screen.findByRole('alert')).textContent).toContain('This request changed');
  expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy();
  expect(state.success).not.toHaveBeenCalled();
});

it('cancels an accepted swap with an optional reason and shows shared contacts', async () => {
  state.mutateAsync.mockResolvedValue({});
  show({ my_role: 'helper', status: 'accepted', accepted_at: '2026-10-02T10:00:00Z', seeker_contact_methods: [{ id: 1, type: 'email', value: 'maya@illinois.edu', is_public: true }] });
  expect(screen.getByRole('link', { name: /maya@illinois.edu/ }).getAttribute('href')).toBe('mailto:maya@illinois.edu');
  await userEvent.click(screen.getByRole('button', { name: 'Cancel swap…' }));
  await userEvent.type(screen.getByLabelText(/Reason/), 'Exams this week');
  await userEvent.click(screen.getByRole('button', { name: 'Cancel swap' }));
  expect(state.mutateAsync).toHaveBeenCalledWith({ id: 9, payload: { version: 3, status: 'cancelled', cancel_reason: 'Exams this week' } });
});

it('asks for a rating, then submits the review and endorsement for the skill learned', async () => {
  state.createReview.mockResolvedValue({});
  state.createEndorsement.mockResolvedValue({});
  show({
    my_role: 'helper', status: 'completed', completed_at: '2026-10-03T10:00:00Z',
    feedback: { target_profile_id: 4, skill: { id: 11, name: 'Figma' }, can_review: true, can_endorse: true, my_review: null, endorsed: false },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Submit feedback' }));
  expect(screen.getByRole('alert').textContent).toBe('Choose a rating from 1 to 5.');
  await userEvent.click(screen.getByLabelText('4 stars'));
  await userEvent.type(screen.getByLabelText('What went well?'), 'Great walkthrough');
  await userEvent.click(screen.getByRole('button', { name: 'Submit feedback' }));
  await waitFor(() => expect(state.createEndorsement).toHaveBeenCalledWith(4, { help_request: 9, skill: 11 }));
  expect(state.createReview).toHaveBeenCalledWith(4, { help_request: 9, rating: 4, comment: 'Great walkthrough', related_skill: 11 });
});

it('explains when a request is not available', () => {
  state.error = { response: { status: 404 } };
  show({});
  expect(screen.getByRole('heading', { name: "This request isn't available" })).toBeTruthy();
});
