import { api } from './api';
import type { DiscoverySearchParams, DiscoverySearchResponse } from '../types/api';

export async function searchDiscovery(params: DiscoverySearchParams) {
  const { data } = await api.get<DiscoverySearchResponse>('/discovery/search/', { params });
  return data;
}

export async function getRecommendedProfiles() {
  const { data } = await api.get<DiscoverySearchResponse>('/discovery/recommended/');
  return data;
}
