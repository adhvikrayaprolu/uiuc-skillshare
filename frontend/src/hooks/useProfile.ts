import { useMutation, useQuery } from '@tanstack/react-query';
import { getProfile, getSimilarProfiles, recordContactClick } from '../lib/profilesApi';
import { mapBackendProfileDetailToProfile, mapBackendProfileListItemToProfileCard } from '../lib/mappers';

export function useProfile(id?: string | number) {
  return useQuery({
    queryKey: ['profile', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const raw = await getProfile(id!);
      return { profile: mapBackendProfileDetailToProfile(raw), raw };
    },
    retry: 1,
  });
}

export function useSimilarProfiles(id?: string | number) {
  return useQuery({
    queryKey: ['similar-profiles', id],
    enabled: Boolean(id),
    queryFn: async () => {
      return { profiles: (await getSimilarProfiles(id!)).map(mapBackendProfileListItemToProfileCard) };
    },
    retry: 1,
  });
}

export function useContactClick() {
  return useMutation({
    mutationFn: ({ profileId, contactMethodId }: { profileId: number; contactMethodId: number }) => recordContactClick(profileId, contactMethodId),
  });
}
