import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {LaunchMetricsPanel} from '../components/analytics/LaunchMetricsPanel';
import {RouteErrorPage} from './RouteErrorPage';

const reportError = vi.hoisted(() => vi.fn());
vi.mock('../lib/errorReporting', () => ({reportError, errorReportingEnabled: () => true}));

function Broken(): never {
  throw new Error('render failed');
}

afterEach(() => {
  cleanup();
  reportError.mockClear();
});

it('shows a recovery screen and reports unexpected render errors', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const swallow = (event: ErrorEvent) => event.preventDefault();
  window.addEventListener('error', swallow);
  const router = createMemoryRouter([{path: '/', Component: Broken, errorElement: <RouteErrorPage />}]);
  render(<RouterProvider router={router} />);
  window.removeEventListener('error', swallow);
  consoleError.mockRestore();
  expect(await screen.findByRole('heading', {name: 'Something went wrong'})).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Reload page'})).toBeTruthy();
  expect(screen.getByRole('link', {name: 'Go to the start'}).getAttribute('href')).toBe('/');
  expect(reportError).toHaveBeenCalledWith(expect.objectContaining({message: 'render failed'}));
  expect(document.title).toBe('Something went wrong · Illini SkillShare');
});

it('treats unmatched routes as not found without reporting', async () => {
  const router = createMemoryRouter([{path: '/', element: <p>Home</p>, errorElement: <RouteErrorPage />}], {initialEntries: ['/missing']});
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole('heading', {name: "We couldn't find that page"})).toBeTruthy();
  expect(screen.queryByRole('button', {name: 'Reload page'})).toBeNull();
  expect(reportError).not.toHaveBeenCalled();
});

it('shows launch metrics with targets and a dash for missing data', () => {
  render(<LaunchMetricsPanel metrics={{
    signups: 10, setup_completion_rate: 0.8, median_minutes_to_first_match: null, sent_request_within_7_days_rate: null, sent_request_cohort: 0,
    acceptance_rate: 0.5, median_response_hours: 3, completion_rate: null, feedback_rate: 0.25, two_sided_swap_feedback_rate: null, review_count: 2, generated_at: '2026-10-18T00:00:00Z',
  }} />);
  expect(screen.getByRole('heading', {name: 'Launch metrics'})).toBeTruthy();
  expect(screen.getByText('80%')).toBeTruthy();
  expect(screen.getByText('Target ≥ 70% · met')).toBeTruthy();
  expect(screen.getByText('Target < 2 minutes')).toBeTruthy();
  expect(screen.getAllByText('—').length).toBe(4);
});
