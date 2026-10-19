import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const post = vi.hoisted(() => vi.fn(() => Promise.resolve({data: null})));
vi.mock('./api', () => ({api: {post}}));

import {errorReportingEnabled, reportError, resetErrorReportsForTests} from './errorReporting';
import {formatHours, formatRate} from './metrics';
import {pageTitle} from './pageTitles';

describe('pageTitle', () => {
  it('names each screen after the brand', () => {
    expect(pageTitle('/')).toBe('Illini SkillShare: swap skills with Illinois students');
    expect(pageTitle('/discover')).toBe('Discover · Illini SkillShare');
    expect(pageTitle('/requests/42')).toBe('Request · Illini SkillShare');
    expect(pageTitle('/settings/')).toBe('Settings · Illini SkillShare');
  });
  it('falls back to not found for unknown paths', () => {
    expect(pageTitle('/nope')).toBe('Page not found · Illini SkillShare');
  });
});

describe('metric formatting', () => {
  it('shows a dash when there is not enough data', () => {
    expect(formatRate(null)).toBe('—');
    expect(formatHours(null)).toBe('—');
  });
  it('formats rates and durations', () => {
    expect(formatRate(0.705)).toBe('71%');
    expect(formatHours(0.25)).toBe('15 min');
    expect(formatHours(5)).toBe('5.0 h');
    expect(formatHours(96)).toBe('4 days');
  });
});

describe('reportError', () => {
  beforeEach(() => {
    post.mockClear();
    resetErrorReportsForTests();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('stays silent in tests and when disabled', () => {
    reportError(new Error('boom'));
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_ERROR_REPORTING', 'false');
    expect(errorReportingEnabled()).toBe(false);
    reportError(new Error('boom'));
    expect(post).not.toHaveBeenCalled();
  });

  it('sends each distinct error once and caps reports per page load', () => {
    vi.stubEnv('MODE', 'production');
    reportError(new TypeError('x is undefined'));
    reportError(new TypeError('x is undefined'));
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/client-errors/', expect.objectContaining({message: 'TypeError: x is undefined', path: '/'}));
    for (let index = 0; index < 20; index += 1) reportError(new Error(`error ${index}`));
    expect(post).toHaveBeenCalledTimes(10);
  });
});
