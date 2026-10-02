import {expect, it, vi} from 'vitest';
import {submissionKey} from './idempotency';
it('produces distinct valid keys in local HTTP contexts without randomUUID', () => {
  const native=crypto.getRandomValues.bind(crypto);
  vi.stubGlobal('crypto',{getRandomValues:native});
  try {
    const first=submissionKey();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(submissionKey()).not.toBe(first);
  } finally {vi.unstubAllGlobals();}
});
