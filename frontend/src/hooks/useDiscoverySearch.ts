import { useQuery } from '@tanstack/react-query';
import { mockProfiles } from '../data/mockData';
import { shouldUseMocks } from '../lib/api';
import { searchDiscovery } from '../lib/discoveryApi';
import { mapBackendProfileListItemToProfileCard } from '../lib/mappers';
import type { DiscoverySearchParams } from '../types/api';

function filterMockProfiles(params: DiscoverySearchParams) {
  const skills = params.skills?.split(',').filter(Boolean) || [];
  const query = params.q?.toLowerCase().trim() || '';
  const year = params.year?.toLowerCase();

  return mockProfiles.filter((profile) => {
    const matchesQuery =
      !query ||
      profile.name.toLowerCase().includes(query) ||
      profile.headline.toLowerCase().includes(query) ||
      profile.skills.some((skill) => skill.name.toLowerCase().includes(query));
    const matchesSkills = !skills.length || skills.some((skillName) => profile.skills.some((skill) => skill.name === skillName));
    const matchesYear = !year || profile.year.toLowerCase() === year;
    const matchesOpen = params.open_to_connect === undefined || profile.openToConnect === params.open_to_connect;
    return matchesQuery && matchesSkills && matchesYear && matchesOpen;
  });
}

export function useDiscoverySearch(params: DiscoverySearchParams) {
  return useQuery({
    queryKey: ['discovery-search', params],
    queryFn: async () => {
      if (shouldUseMocks()) {
        return { count: filterMockProfiles(params).length, profiles: filterMockProfiles(params), isMock: true };
      }
      let response;
      try {
        response = await searchDiscovery(params);
      } catch (error) {
        // Graceful fallback: if semantic mode errors, retry once in default mode.
        if (params.mode === 'semantic') {
          const fallbackParams = { ...params };
          delete fallbackParams.mode;
          response = await searchDiscovery(fallbackParams);
        } else {
          throw error;
        }
      }
      return {
        count: response.count,
        profiles: response.results.map(mapBackendProfileListItemToProfileCard),
        ai: response.ai,
        isMock: false,
      };
    },
    retry: 1,
  });
}
