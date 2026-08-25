import { api } from './api';
import type { AnalyticsSummaryResponse } from '../types/api';

export async function getAnalyticsSummary() {
  const { data } = await api.get<AnalyticsSummaryResponse>('/analytics/summary/');
  return data;
}
