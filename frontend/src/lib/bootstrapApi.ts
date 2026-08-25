import { api } from './api';
import type { BootstrapResponse } from '../types/api';

export async function getBootstrap() {
  const { data } = await api.get<BootstrapResponse>('/bootstrap/');
  return data;
}

export async function getOnboardingStatus() {
  const { data } = await api.get<{
    has_completed_onboarding: boolean;
    has_profile: boolean;
    profile_completeness: number;
    missing_steps: string[];
  }>('/onboarding/status/');
  return data;
}
