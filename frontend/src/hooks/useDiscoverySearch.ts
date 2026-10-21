import { useQuery } from '@tanstack/react-query';
import { searchDiscovery } from '../lib/discoveryApi';
import { mapBackendProfileListItemToProfileCard } from '../lib/mappers';
import type { DiscoverySearchParams } from '../types/api';

export function useDiscoverySearch(params: DiscoverySearchParams) {
  return useQuery({
    queryKey: ['discovery-search', params],
    queryFn: async () => {
      const response = await searchDiscovery(params);
      return {
        count: response.count,
        profiles: response.results.map(mapBackendProfileListItemToProfileCard),
        matching: response.matching,
        next: response.next,
        previous: response.previous,
      };
    },
    retry: 1,
  });
}
