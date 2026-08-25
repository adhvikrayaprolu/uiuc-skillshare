import { useQuery } from '@tanstack/react-query';
import { shouldUseMocks } from '../lib/api';
import { getDashboard } from '../lib/dashboardApi';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    enabled: !shouldUseMocks(),
    retry: 1,
  });
}
