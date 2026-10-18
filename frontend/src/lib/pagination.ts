import {api} from './api';
import type {PaginatedResponse} from '../types/api';
export async function getAllPages<T>(path: string, params?: Record<string, unknown>): Promise<T[]> {
  const rows: T[] = []; let page = 1;
  for (;;) {
    const {data} = await api.get<PaginatedResponse<T> | T[]>(path, {params: {...params, page}});
    if (Array.isArray(data)) return data;
    rows.push(...data.results);
    if (!data.next) return rows;
    page += 1;
  }
}
