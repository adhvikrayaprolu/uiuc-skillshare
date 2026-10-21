import { useQuery } from '@tanstack/react-query';
import { getSwapMatches } from '../lib/discoveryApi';
import { mapBackendProfileListItemToProfileCard } from '../lib/mappers';

export function useSwapMatches(page = 1, enabled = true) {
  return useQuery({
    queryKey: ['swap-matches', page],
    enabled,
    queryFn: async () => {
      const response = await getSwapMatches(page);
      return { profiles: response.results.map(mapBackendProfileListItemToProfileCard), count: response.count, next: response.next, matching: response.matching };
    },
    retry: 1,
  });
}
