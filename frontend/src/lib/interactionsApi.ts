import { getAllPages } from './pagination';
import { api } from './api';
import type { Endorsement, HelpRequest, HelpRequestPayload, Review, SavedProfile } from '../types/api';

export async function getSavedProfiles() {
  return getAllPages<SavedProfile>('/saved-profiles/');
}

export async function saveProfile(savedProfile: number, note = '') {
  const { data } = await api.post<SavedProfile>('/saved-profiles/', { saved_profile: savedProfile, note });
  return data;
}

export async function deleteSavedProfile(id: number) {
  await api.delete(`/saved-profiles/${id}/`);
}

export async function getHelpRequests() {
  return getAllPages<HelpRequest>('/help-requests/');
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
  return getAllPages<Review>(`/profiles/${profileId}/reviews/`);
}

export async function createReview(profileId: number, payload: { help_request: number; rating: number; comment: string; related_skill?: number | null }) {
  const { data } = await api.post<Review>(`/profiles/${profileId}/reviews/`, payload);
  return data;
}

export async function getEndorsements(profileId: number) {
  return getAllPages<Endorsement>(`/profiles/${profileId}/endorsements/`);
}

export async function createEndorsement(profileId: number, payload: { help_request: number; skill?: number | null; note?: string }) {
  const { data } = await api.post<Endorsement>(`/profiles/${profileId}/endorsements/`, payload);
  return data;
}
