import { useQuery } from '@tanstack/react-query';
import { mockProfiles } from '../data/mockData';
import { shouldUseMocks } from '../lib/api';
import { getRecommendedProfiles } from '../lib/discoveryApi';
import { mapBackendProfileListItemToProfileCard } from '../lib/mappers';

export function useRecommendedProfiles() {
  return useQuery({
    queryKey: ['recommended-profiles'],
    queryFn: async () => {
      if (shouldUseMocks()) return { profiles: mockProfiles.slice(0, 3), isMock: true };
      const response = await getRecommendedProfiles();
      return { profiles: response.results.map(mapBackendProfileListItemToProfileCard), isMock: false };
    },
    retry: 1,
  });
}
