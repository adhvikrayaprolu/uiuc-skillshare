import { useMutation, useQuery } from '@tanstack/react-query';
import { mockProfiles } from '../data/mockData';
import { shouldUseMocks } from '../lib/api';
import { getProfile, getSimilarProfiles, recordContactClick } from '../lib/profilesApi';
import { mapBackendProfileDetailToProfile, mapBackendProfileListItemToProfileCard } from '../lib/mappers';

export function useProfile(id?: string | number) {
  return useQuery({
    queryKey: ['profile', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const fallback = mockProfiles.find((profile) => profile.id === Number(id)) || mockProfiles[0];
      if (shouldUseMocks() || !id) return { profile: fallback, isMock: true };
      return { profile: mapBackendProfileDetailToProfile(await getProfile(id)), isMock: false };
    },
    retry: 1,
  });
}

export function useSimilarProfiles(id?: string | number) {
  return useQuery({
    queryKey: ['similar-profiles', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const fallback = mockProfiles.filter((profile) => profile.id !== Number(id)).slice(0, 3);
      if (shouldUseMocks() || !id) return { profiles: fallback, isMock: true };
      return { profiles: (await getSimilarProfiles(id)).map(mapBackendProfileListItemToProfileCard), isMock: false };
    },
    retry: 1,
  });
}

export function useContactClick() {
  return useMutation({
    mutationFn: ({ profileId, contactMethodId }: { profileId: number; contactMethodId: number }) => {
      if (shouldUseMocks()) return Promise.resolve({ success: true });
      return recordContactClick(profileId, contactMethodId);
    },
  });
}
