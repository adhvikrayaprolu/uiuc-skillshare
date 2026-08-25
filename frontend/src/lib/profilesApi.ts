import { api } from './api';
import type { Availability, ContactMethod, Credential, PaginatedResponse, ProfileDetail, ProfileListItem, ProfileSkill } from '../types/api';

export async function getProfiles(params?: Record<string, unknown>) {
  const { data } = await api.get<PaginatedResponse<ProfileListItem>>('/profiles/', { params });
  return data;
}

export async function getProfile(id: number | string) {
  const { data } = await api.get<ProfileDetail>(`/profiles/${id}/`);
  return data;
}

export async function getSimilarProfiles(id: number | string) {
  const { data } = await api.get<PaginatedResponse<ProfileListItem> | ProfileListItem[]>(`/profiles/${id}/similar/`);
  return Array.isArray(data) ? data : data.results;
}

export async function getCurrentProfile() {
  const { data } = await api.get<ProfileDetail>('/profiles/me/');
  return data;
}

export async function updateCurrentProfile(payload: Partial<ProfileDetail>) {
  const { data } = await api.patch<ProfileDetail>('/profiles/me/', payload);
  return data;
}

export async function createCurrentProfile(payload: Partial<ProfileDetail>) {
  const { data } = await api.post<ProfileDetail>('/profiles/me/', payload);
  return data;
}

export async function getProfileSkills() {
  const { data } = await api.get<PaginatedResponse<ProfileSkill> | ProfileSkill[]>('/profiles/me/skills/');
  return Array.isArray(data) ? data : data.results;
}

export async function createProfileSkill(payload: Omit<ProfileSkill, 'id' | 'skill_detail'>) {
  const { data } = await api.post<ProfileSkill>('/profiles/me/skills/', payload);
  return data;
}

export async function updateProfileSkill(id: number, payload: Partial<ProfileSkill>) {
  const { data } = await api.patch<ProfileSkill>(`/profiles/me/skills/${id}/`, payload);
  return data;
}

export async function deleteProfileSkill(id: number) {
  await api.delete(`/profiles/me/skills/${id}/`);
}

export async function getAvailability() {
  const { data } = await api.get<PaginatedResponse<Availability> | Availability[]>('/profiles/me/availability/');
  return Array.isArray(data) ? data : data.results;
}

export async function createAvailability(payload: Omit<Availability, 'id'>) {
  const { data } = await api.post<Availability>('/profiles/me/availability/', payload);
  return data;
}

export async function updateAvailability(id: number, payload: Partial<Availability>) {
  const { data } = await api.patch<Availability>(`/profiles/me/availability/${id}/`, payload);
  return data;
}

export async function deleteAvailability(id: number) {
  await api.delete(`/profiles/me/availability/${id}/`);
}

export async function getContactMethods() {
  const { data } = await api.get<PaginatedResponse<ContactMethod> | ContactMethod[]>('/profiles/me/contact-methods/');
  return Array.isArray(data) ? data : data.results;
}

export async function createContactMethod(payload: Omit<ContactMethod, 'id'>) {
  const { data } = await api.post<ContactMethod>('/profiles/me/contact-methods/', payload);
  return data;
}

export async function updateContactMethod(id: number, payload: Partial<ContactMethod>) {
  const { data } = await api.patch<ContactMethod>(`/profiles/me/contact-methods/${id}/`, payload);
  return data;
}

export async function deleteContactMethod(id: number) {
  await api.delete(`/profiles/me/contact-methods/${id}/`);
}

export async function getCredentials() {
  const { data } = await api.get<PaginatedResponse<Credential> | Credential[]>('/profiles/me/credentials/');
  return Array.isArray(data) ? data : data.results;
}

export async function createCredential(payload: Omit<Credential, 'id'>) {
  const { data } = await api.post<Credential>('/profiles/me/credentials/', payload);
  return data;
}

export async function updateCredential(id: number, payload: Partial<Credential>) {
  const { data } = await api.patch<Credential>(`/profiles/me/credentials/${id}/`, payload);
  return data;
}

export async function deleteCredential(id: number) {
  await api.delete(`/profiles/me/credentials/${id}/`);
}

export async function recordContactClick(profileId: number, contactMethodId: number) {
  const { data } = await api.post<{ success: boolean }>(`/profiles/${profileId}/contact-click/`, {
    contact_method_id: contactMethodId,
  });
  return data;
}
