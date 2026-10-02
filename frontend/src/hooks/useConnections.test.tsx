import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useConnections } from './useConnections';

vi.mock('./useAuth', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
vi.mock('./useHelpRequests', () => ({ useHelpRequests: () => ({
  data: { isMock: false, raw: ['pending', 'accepted', 'completed', 'cancelled'].map((status, id) => ({
    id, status, seeker: 1, helper_profile: 10, topic: status,
    helper_profile_detail: { id: 10, display_name: 'Helper' },
    helper_contact_methods: [{ type: 'email', value: 'shared@example.org' }],
  })) }, isLoading: false, isError: false,
}) }));

describe('connection history', () => {
  it('retains both accepted and completed interactions and shared contacts', () => {
    const { result } = renderHook(() => useConnections());
    expect(result.current.connections.map(row => row.status)).toEqual(['accepted', 'completed']);
    expect(result.current.connections[1].contactMethods[0].value).toBe('shared@example.org');
  });
});
