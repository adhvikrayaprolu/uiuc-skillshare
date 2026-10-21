import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../lib/dashboardApi';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    retry: 1,
  });
}
