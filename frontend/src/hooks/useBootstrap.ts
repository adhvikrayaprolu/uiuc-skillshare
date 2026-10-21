import { useQuery } from '@tanstack/react-query';
import { getBootstrap, getOnboardingStatus } from '../lib/bootstrapApi';

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: getBootstrap,
    retry: 1,
  });
}

export function useOnboardingStatus(enabled = true) {
  return useQuery({
    queryKey: ['onboarding-status'],
    queryFn: getOnboardingStatus,
    enabled,
    retry: 1,
  });
}
