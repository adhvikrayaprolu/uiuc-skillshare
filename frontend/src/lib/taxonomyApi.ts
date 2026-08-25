import { api } from './api';
import type { PaginatedResponse, SkillCategory, SkillTag } from '../types/api';

export async function getSkillCategories() {
  const { data } = await api.get<SkillCategory[]>('/skill-categories/');
  return data;
}

export async function getSkills(params?: Record<string, unknown>) {
  const { data } = await api.get<PaginatedResponse<SkillTag> | SkillTag[]>('/skills/', { params });
  return Array.isArray(data) ? data : data.results;
}

export async function getPopularSkills() {
  const { data } = await api.get<SkillTag[]>('/skills/popular/');
  return data;
}
