import { useQuery } from '@tanstack/react-query';
import { shouldUseMocks } from '../lib/api';
import { getBootstrap, getOnboardingStatus } from '../lib/bootstrapApi';

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: getBootstrap,
    enabled: !shouldUseMocks(),
    retry: 1,
  });
}

export function useOnboardingStatus(enabled = true) {
  return useQuery({
    queryKey: ['onboarding-status'],
    queryFn: getOnboardingStatus,
    enabled: enabled && !shouldUseMocks(),
    retry: 1,
  });
}
