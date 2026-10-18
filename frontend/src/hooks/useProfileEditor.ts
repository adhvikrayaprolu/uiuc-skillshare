import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shouldUseMocks } from '../lib/api';
import { createCurrentProfile, getAvailability, getContactMethods, getCredentials, getCurrentProfile, getProfileSkills, updateCurrentProfile } from '../lib/profilesApi';
import type { ProfileDetail } from '../types/api';

export function useCurrentProfile() {
  return useQuery({
    queryKey: ['current-profile'],
    refetchOnWindowFocus: false,
    queryFn: getCurrentProfile,
    enabled: !shouldUseMocks(),
    retry: 1,
  });
}

export function useProfileEditor() {
  const queryClient = useQueryClient();
  const updateProfile = useMutation({
    mutationFn: (payload: Partial<ProfileDetail>) => (shouldUseMocks() ? Promise.resolve(payload) : updateCurrentProfile(payload)),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({queryKey: ['current-profile']});
      const previous = queryClient.getQueryData<ProfileDetail>(['current-profile']);
      if (previous) queryClient.setQueryData(['current-profile'], {...previous, ...payload});
      return {previous};
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) queryClient.setQueryData(['current-profile'], context.previous);
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const createProfile = useMutation({
    mutationFn: (payload: Partial<ProfileDetail>) => (shouldUseMocks() ? Promise.resolve(payload) : createCurrentProfile(payload)),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  return { updateProfile, createProfile };
}

export function useProfileEditorResources() {
  return useQuery({
    queryKey: ['profile-editor-resources'],
    queryFn: async () => {
      if (shouldUseMocks()) return { skills: [], availability: [], contactMethods: [], credentials: [] };
      const [skills, availability, contactMethods, credentials] = await Promise.all([
        getProfileSkills(),
        getAvailability(),
        getContactMethods(),
        getCredentials(),
      ]);
      return { skills, availability, contactMethods, credentials };
    },
    retry: 1,
  });
}
