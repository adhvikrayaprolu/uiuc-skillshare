import { useQuery } from '@tanstack/react-query';
import { shouldUseMocks } from '../lib/api';
import { getSwapMatches } from '../lib/discoveryApi';
import { mapBackendProfileListItemToProfileCard } from '../lib/mappers';

export function useSwapMatches(page = 1, enabled = true) {
  return useQuery({
    queryKey: ['swap-matches', page],
    enabled,
    queryFn: async () => {
      if (shouldUseMocks()) return { profiles: [], count: 0, next: null, matching: undefined, isMock: true };
      const response = await getSwapMatches(page);
      return { profiles: response.results.map(mapBackendProfileListItemToProfileCard), count: response.count, next: response.next, matching: response.matching, isMock: false };
    },
    retry: 1,
  });
}
