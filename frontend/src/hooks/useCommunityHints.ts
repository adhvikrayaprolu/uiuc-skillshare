import { useQuery } from '@tanstack/react-query';
import { getCommunityHints } from '../lib/discoveryApi';

export function useCommunityHints(enabled = true) {
  return useQuery({
    queryKey: ['community-hints'],
    enabled,
    queryFn: getCommunityHints,
    staleTime: 60_000,
    retry: 1,
  });
}
