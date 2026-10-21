import { useQuery } from '@tanstack/react-query';
import { getRecommendedProfiles } from '../lib/discoveryApi';
import { mapBackendProfileListItemToProfileCard } from '../lib/mappers';

export function useRecommendedProfiles() {
  return useQuery({
    queryKey: ['recommended-profiles'],
    queryFn: async () => {
      const response = await getRecommendedProfiles();
      return { profiles: response.results.map(mapBackendProfileListItemToProfileCard), matching: response.matching };
    },
    retry: 1,
  });
}
