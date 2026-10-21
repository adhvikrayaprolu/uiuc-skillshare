import { api } from './api';
import type { CommunityHints, DiscoverySearchParams, DiscoverySearchResponse } from '../types/api';

export async function getCommunityHints() {
  const { data } = await api.get<CommunityHints>('/discovery/community/');
  return data;
}

export async function searchDiscovery(params: DiscoverySearchParams) {
  const { data } = await api.get<DiscoverySearchResponse>('/discovery/search/', { params });
  return data;
}

export async function getSwapMatches(page = 1) {
  const { data } = await api.get<DiscoverySearchResponse>('/discovery/swaps/', { params: { page } });
  return data;
}

export async function getRecommendedProfiles() {
  const { data } = await api.get<DiscoverySearchResponse>('/discovery/recommended/');
  return data;
}
