import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shouldUseMocks } from '../lib/api';
import { createHelpRequest, getHelpRequest, getRequestBucket, updateHelpRequest, type HelpRequestUpdate } from '../lib/interactionsApi';
import type { HelpRequestPayload, PaginatedResponse, HelpRequest, RequestBucket } from '../types/api';

const emptyPage: PaginatedResponse<HelpRequest> = { count: 0, next: null, previous: null, results: [] };

export function useRequestBucket(bucket: RequestBucket, page = 1) {
  return useQuery({
    queryKey: ['help-requests', 'bucket', bucket, page],
    queryFn: () => (shouldUseMocks() ? Promise.resolve(emptyPage) : getRequestBucket(bucket, page)),
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

export function useHelpRequest(id: number) {
  return useQuery({
    queryKey: ['help-requests', 'detail', id],
    queryFn: () => getHelpRequest(id),
    enabled: Number.isFinite(id) && id > 0 && !shouldUseMocks(),
    retry: (count, error) => count < 1 && (error as { response?: { status?: number } }).response?.status !== 404,
  });
}

export function useCreateHelpRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: HelpRequestPayload) => {
      if (shouldUseMocks()) return Promise.resolve(null);
      return createHelpRequest(payload);
    },
    onSuccess: () => queryClient.invalidateQueries(),
    onError: () => queryClient.invalidateQueries(),
  });
}

export function useUpdateHelpRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: HelpRequestUpdate }) => updateHelpRequest(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['help-requests', 'detail', data.id], data);
      return queryClient.invalidateQueries();
    },
    onError: () => queryClient.invalidateQueries(),
  });
}
