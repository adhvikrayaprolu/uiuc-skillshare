import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mockHelpRequests } from '../data/mockData';
import { shouldUseMocks } from '../lib/api';
import { createHelpRequest, getHelpRequests, updateHelpRequest } from '../lib/interactionsApi';
import { mapBackendHelpRequestToRequestCard } from '../lib/mappers';
import type { HelpRequest, HelpRequestPayload } from '../types/api';

export function useHelpRequests() {
  return useQuery({
    queryKey: ['help-requests'],
    queryFn: async () => {
      if (shouldUseMocks()) return { requests: mockHelpRequests, raw: [], isMock: true };
      const raw = await getHelpRequests();
      return {
        raw,
        requests: raw.map((item) => mapBackendHelpRequestToRequestCard(item)),
        isMock: false,
      };
    },
    retry: 1,
  });
}

export function useCreateHelpRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: HelpRequestPayload) => {
      if (shouldUseMocks()) return Promise.resolve(null);
      return createHelpRequest(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['help-requests'] }),
  });
}

export function useUpdateHelpRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<HelpRequest> }) => {
      if (shouldUseMocks()) return Promise.resolve(null);
      return updateHelpRequest(id, payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['help-requests'] }),
  });
}
