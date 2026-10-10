import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { useScreenActive } from '../../hooks/useScreenActive';
import { AdminAction, CustomerAction, RefundPayout, ReturnCase, ReturnRequest, ReturnSummary } from './return-types';

const path = (orderId: string) => `/returns/orders/${orderId}`;
export const returnApi = {
  payout: (record: ReturnCase) => apiRequest<{ payout: RefundPayout | null }>(`${path(record.orderId)}/${record.id}/payout`, { method: 'GET' }),
  read: (record: ReturnCase, admin: boolean) => apiRequest(
    `${admin ? '/returns/admin/orders' : '/returns/orders'}/${record.orderId}/${record.id}/read`, { body: { version: record.version } }),
  list: (orderId: string, admin = false) => apiRequest<{ cases: ReturnCase[] }>(admin ? `/returns/admin/orders/${orderId}` : path(orderId), { method: 'GET' }),
  create: (orderId: string, body: ReturnRequest) => apiRequest<{ cases: ReturnCase[] }>(path(orderId), { body }),
  action: (record: ReturnCase, body: CustomerAction | AdminAction, admin: boolean) => apiRequest<{ case: ReturnCase }>(
    `${admin ? '/returns/admin/orders' : '/returns/orders'}/${record.orderId}/${record.id}/actions`, { body }),
  upload: (orderId: string, data: string) => apiRequest<{ id: string }>(`${path(orderId)}/photos`, { body: { data }, timeoutMs: 30000 }),
  photo: (orderId: string, id: string) => apiRequest<{ data: string }>(`${path(orderId)}/photos/${id}`, { method: 'GET' }),
};
export function useReturnCases(orderId: string, admin = false, enabled = true) {
  const { user } = useAuth();
  const active = useScreenActive(enabled);
  return useQuery({ queryKey: ['return-cases', user?.id, orderId, admin], queryFn: () => returnApi.list(orderId, admin),
    enabled: active && !!user && (!admin || !!user.roles?.includes('admin')), refetchInterval: active ? 15000 : false, retry: 1 });
}
export function useReturnMutation(orderId: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  return useMutation({ mutationFn: (input: ReturnRequest) => returnApi.create(orderId, input), retry: false,
    onSuccess: async (result) => {
      // Publish the committed request immediately, before any background refresh.
      client.setQueryData(['return-cases', user?.id, orderId, false], result);
      await Promise.all([
      client.invalidateQueries({ queryKey: ['return-cases'] }), client.invalidateQueries({ queryKey: ['orders'] }),
      client.invalidateQueries({ queryKey: ['order'] }),
      client.invalidateQueries({ queryKey: ['seller-orders'] }), client.invalidateQueries({ queryKey: ['return-admin'] }),
      client.invalidateQueries({ queryKey: ['return-inbox'] }),
    ].map((refresh) => refresh.catch(() => undefined))); } });
}
export function useReturnAction(record: ReturnCase, admin: boolean) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: CustomerAction | AdminAction) => returnApi.action(record, input, admin), retry: false,
    onSuccess: async () => { await Promise.all([
      client.invalidateQueries({ queryKey: ['admin-analytics'] }),
      client.invalidateQueries({ queryKey: ['admin-shipping-all'] }),
      client.invalidateQueries({ queryKey: ['return-cases'] }),
      client.invalidateQueries({ queryKey: ['return-admin'] }),
      client.invalidateQueries({ queryKey: ['orders'] }),
      client.invalidateQueries({ queryKey: ['seller-orders'] }),
      client.invalidateQueries({ queryKey: ['return-inbox'] }),
      ...['seller-products', 'seller-product', 'shop-products', 'shop-product', 'shop-product-lookup', 'cart', 'inventory-alerts']
        .map((key) => client.invalidateQueries({ queryKey: [key] })),
    ]); } });
}
export function useReturnInbox(status = 'all', enabled = true) {
  const { user } = useAuth();
  const active = useScreenActive(enabled);
  return useInfiniteQuery({ queryKey: ['return-inbox', user?.id, status], initialPageParam: 1,
    queryFn: ({ pageParam }) => apiRequest<{ cases: ReturnSummary[]; nextPage: number | null; total: number }>(
      `/returns/mine?status=${status}&page=${pageParam}`, { method: 'GET' }),
    enabled: active && !!user, getNextPageParam: (last) => last.nextPage ?? undefined,
    refetchInterval: active ? 15000 : false, retry: 1 });
}
export function useAdminReturnCases(status: string, enabled = true) {
  const { user } = useAuth();
  const active = useScreenActive(enabled);
  return useInfiniteQuery({ queryKey: ['return-admin', user?.id, status], initialPageParam: 1,
    queryFn: ({ pageParam }) => apiRequest<{ cases: ReturnSummary[]; nextPage: number | null; total: number }>(
      `/returns/admin?status=${status}&page=${pageParam}`, { method: 'GET' }),
    enabled: active && !!user?.roles?.includes('admin'),
    getNextPageParam: (last) => last.nextPage ?? undefined, refetchInterval: active ? 30000 : false, retry: 1 });
}
