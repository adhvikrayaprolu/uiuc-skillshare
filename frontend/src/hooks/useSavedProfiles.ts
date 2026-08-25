import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mockProfiles } from '../data/mockData';
import { shouldUseMocks } from '../lib/api';
import { deleteSavedProfile, getSavedProfiles, saveProfile } from '../lib/interactionsApi';
import { mapBackendProfileListItemToProfileCard } from '../lib/mappers';

export function useSavedProfiles() {
  return useQuery({
    queryKey: ['saved-profiles'],
    queryFn: async () => {
      if (shouldUseMocks()) return { profiles: mockProfiles.slice(0, 4), saved: [], isMock: true };
      const saved = await getSavedProfiles();
      return {
        saved,
        profiles: saved.map((item) => mapBackendProfileListItemToProfileCard(item.saved_profile_detail)),
        isMock: false,
      };
    },
    retry: 1,
  });
}

export function useSaveProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, note }: { profileId: number; note?: string }) => {
      if (shouldUseMocks()) return Promise.resolve(null);
      return saveProfile(profileId, note);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-profiles'] }),
  });
}

export function useDeleteSavedProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (savedProfileId: number) => {
      if (shouldUseMocks()) return Promise.resolve();
      return deleteSavedProfile(savedProfileId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-profiles'] }),
  });
}

export function useSavedProfileActions() {
  const savedQuery = useSavedProfiles();
  const saveMutation = useSaveProfileMutation();
  const deleteMutation = useDeleteSavedProfileMutation();

  const savedByProfileId = new Map<number, number>();
  savedQuery.data?.saved.forEach((item) => {
    savedByProfileId.set(item.saved_profile, item.id);
  });

  const toggleSaved = async (profileId: number) => {
    const savedId = savedByProfileId.get(profileId);
    if (savedId) {
      await deleteMutation.mutateAsync(savedId);
      return false;
    }
    await saveMutation.mutateAsync({ profileId });
    return true;
  };

  return {
    savedQuery,
    savedProfileIds: new Set(savedByProfileId.keys()),
    savedByProfileId,
    toggleSaved,
    isPending: saveMutation.isPending || deleteMutation.isPending,
  };
}
