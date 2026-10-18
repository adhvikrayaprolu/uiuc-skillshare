import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, shouldUseMocks } from '../lib/api';
import type { NotificationItem } from '../components/layout/NotificationDropdown';

type NotificationPage = {
  results: Array<{ id: number; kind: string; title: string; href: string; read: boolean; created_at: string }>;
  next: string | null; previous: string | null; unread_count: number;
};
export function useNotifications() {
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications', page], enabled: !shouldUseMocks(),
    queryFn: async () => (await api.get<NotificationPage>('/notifications/', { params: { page } })).data,
    refetchInterval: 30000,
  });
  const markRead = useMutation({ mutationFn: async (id: string) => api.post(`/notifications/${id}/read/`), onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }) });
  const markAllRead = useMutation({ mutationFn: async () => api.post('/notifications/read-all/'), onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }) });
  const items: NotificationItem[] = (query.data?.results || []).map(row => ({ id: String(row.id), type: row.kind === 'created' ? 'request' : 'accepted', title: row.title, description: 'Open Requests for details.', href: row.href, read: row.read, timeLabel: new Date(row.created_at).toLocaleString() }));
  return { query, items, markRead, markAllRead, page, setPage };
}
