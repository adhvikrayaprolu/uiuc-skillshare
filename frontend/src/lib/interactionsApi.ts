import { getAllPages } from './pagination';
import { api } from './api';
import type { Endorsement, HelpRequest, HelpRequestPayload, PaginatedResponse, RequestBucket, Review, SavedProfile } from '../types/api';

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

export async function getRequestBucket(bucket: RequestBucket, page = 1) {
  const { data } = await api.get<PaginatedResponse<HelpRequest>>('/help-requests/', { params: { bucket, page } });
  return data;
}

export async function getHelpRequest(id: number) {
  const { data } = await api.get<HelpRequest>(`/help-requests/${id}/`);
  return data;
}

export async function createHelpRequest(payload: HelpRequestPayload) {
  const { data } = await api.post<HelpRequest>('/help-requests/', payload);
  return data;
}

export type HelpRequestUpdate = Pick<HelpRequest, 'version'> & Partial<Pick<HelpRequest, 'status' | 'response_message' | 'cancel_reason'>>;

export async function updateHelpRequest(id: number, payload: HelpRequestUpdate) {
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
