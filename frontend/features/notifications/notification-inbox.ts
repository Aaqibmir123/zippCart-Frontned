import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api/client';

export type OrderNotification = { id: string; title: string; body: string; orderId: string; createdAt: string };
type InboxPage = { notifications: OrderNotification[]; page: number; hasMore: boolean };

export function useNotificationInbox() {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['notification-inbox', user?.id],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => apiRequest<InboxPage>(`/notifications/inbox?page=${pageParam}&limit=20`, { method: 'GET', signal }),
    getNextPageParam: (last) => last.hasMore ? last.page + 1 : undefined,
    enabled: !!user,
  });
}
