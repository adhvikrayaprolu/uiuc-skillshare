import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shouldUseMocks } from '../lib/api';
import { createCurrentProfile, getAvailability, getContactMethods, getCredentials, getCurrentProfile, getProfileSkills, updateCurrentProfile } from '../lib/profilesApi';
import type { ProfileDetail } from '../types/api';

export function useCurrentProfile() {
  return useQuery({
    queryKey: ['current-profile'],
    queryFn: getCurrentProfile,
    enabled: !shouldUseMocks(),
    retry: 1,
  });
}

export function useProfileEditor() {
  const queryClient = useQueryClient();
  const updateProfile = useMutation({
    mutationFn: (payload: Partial<ProfileDetail>) => (shouldUseMocks() ? Promise.resolve(payload) : updateCurrentProfile(payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['current-profile'] }),
  });
  const createProfile = useMutation({
    mutationFn: (payload: Partial<ProfileDetail>) => (shouldUseMocks() ? Promise.resolve(payload) : createCurrentProfile(payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['current-profile'] }),
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
