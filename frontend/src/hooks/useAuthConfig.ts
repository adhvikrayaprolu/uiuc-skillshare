import { useQuery } from '@tanstack/react-query';
import { getAuthConfig } from '../lib/authApi';

/** Which sign-in options this server offers; options that are not configured stay hidden. */
export function useAuthConfig() {
  return useQuery({ queryKey: ['auth-config'], queryFn: getAuthConfig, staleTime: Infinity, retry: 1 });
}
