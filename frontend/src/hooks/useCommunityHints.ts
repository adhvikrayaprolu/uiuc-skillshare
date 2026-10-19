import { useQuery } from '@tanstack/react-query';
import { shouldUseMocks } from '../lib/api';
import { getCommunityHints } from '../lib/discoveryApi';
import type { CommunityHints } from '../types/api';

const emptyHints: CommunityHints = { member_count: 0, popular: [], unmet: [], my_untaught_goals: [] };

export function useCommunityHints(enabled = true) {
  return useQuery({
    queryKey: ['community-hints'],
    enabled,
    queryFn: () => (shouldUseMocks() ? Promise.resolve(emptyHints) : getCommunityHints()),
    staleTime: 60_000,
    retry: 1,
  });
}
