import { api } from './api';
import type { DashboardResponse } from '../types/api';

export async function getDashboard() {
  const { data } = await api.get<DashboardResponse>('/dashboard/');
  return data;
}
