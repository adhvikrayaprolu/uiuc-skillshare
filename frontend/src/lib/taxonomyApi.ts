import {api} from './api';
import {getAllPages} from './pagination';
import type {SkillCategory, SkillTag} from '../types/api';
export function getSkillCategories() {return getAllPages<SkillCategory>('/skill-categories/');}
export function getSkills(params?: Record<string, unknown>) {return getAllPages<SkillTag>('/skills/', params);}
export function getPopularSkills() {return getAllPages<SkillTag>('/skills/popular/');}
export async function suggestSkill(category: number, name: string) {return (await api.post('/skills/suggest/', {category, name})).data;}
