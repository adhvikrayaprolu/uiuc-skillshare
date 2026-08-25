import { api } from './api';
import type { Endorsement, HelpRequest, HelpRequestPayload, PaginatedResponse, Review, SavedProfile } from '../types/api';

export async function getSavedProfiles() {
  const { data } = await api.get<PaginatedResponse<SavedProfile> | SavedProfile[]>('/saved-profiles/');
  return Array.isArray(data) ? data : data.results;
}

export async function saveProfile(savedProfile: number, note = '') {
  const { data } = await api.post<SavedProfile>('/saved-profiles/', { saved_profile: savedProfile, note });
  return data;
}

export async function deleteSavedProfile(id: number) {
  await api.delete(`/saved-profiles/${id}/`);
}

export async function getHelpRequests() {
  const { data } = await api.get<PaginatedResponse<HelpRequest> | HelpRequest[]>('/help-requests/');
  return Array.isArray(data) ? data : data.results;
}

export async function createHelpRequest(payload: HelpRequestPayload) {
  const { data } = await api.post<HelpRequest>('/help-requests/', payload);
  return data;
}

export async function updateHelpRequest(id: number, payload: Partial<HelpRequest>) {
  const { data } = await api.patch<HelpRequest>(`/help-requests/${id}/`, payload);
  return data;
}

export async function getReviews(profileId: number) {
  const { data } = await api.get<PaginatedResponse<Review> | Review[]>(`/profiles/${profileId}/reviews/`);
  return Array.isArray(data) ? data : data.results;
}

export async function createReview(profileId: number, payload: { rating: number; comment: string; related_skill?: number | null }) {
  const { data } = await api.post<Review>(`/profiles/${profileId}/reviews/`, payload);
  return data;
}

export async function getEndorsements(profileId: number) {
  const { data } = await api.get<PaginatedResponse<Endorsement> | Endorsement[]>(`/profiles/${profileId}/endorsements/`);
  return Array.isArray(data) ? data : data.results;
}

export async function createEndorsement(profileId: number, payload: { skill?: number | null; note?: string }) {
  const { data } = await api.post<Endorsement>(`/profiles/${profileId}/endorsements/`, payload);
  return data;
}
