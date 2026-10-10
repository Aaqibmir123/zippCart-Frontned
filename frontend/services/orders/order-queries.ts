import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useScreenActive } from '../../hooks/useScreenActive';
import { CheckoutAddress, orderApi, OrderHistoryTab, ReturnRequestInput } from '../api/order-api';
import { cartKey } from '../cart/cart-queries';
import { assertUserSession, isCurrentSession } from '../auth/session-scope';

export function useCheckoutQuote(address: CheckoutAddress | null, revision?: number, enabled = true) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['checkout', user?.id, address, revision], queryFn: () => orderApi.quote(address!),
    enabled: !!user && !!address && enabled, staleTime: 0, retry: false, placeholderData: (previous) => previous });
}
export function useOrders(tab: OrderHistoryTab = 'active') {
  const { user, session } = useAuth();
  const focused = useScreenActive();
  return useInfiniteQuery({
    queryKey: ['orders', user?.id, 'pages', tab, session?.generation],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      assertUserSession(session);
      const page = await orderApi.list({ tab, cursor: pageParam, limit: 20 }, signal);
      assertUserSession(session);
      return page;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!user && !!session && focused,
    refetchOnMount: 'always',
    refetchInterval: focused && tab === 'active' ? 30000 : false,
  });
}
export function useReorder() {
  const client = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationKey: ['reorder-write', session?.userId, session?.generation],
    mutationFn: async (input: Parameters<typeof orderApi.reorder>[0]) => {
      assertUserSession(session);
      const result = await orderApi.reorder(input);
      assertUserSession(session);
      return result;
    },
    retry: false,
    onSuccess: async () => {
      if (!isCurrentSession(session)) return;
      await client.invalidateQueries({ queryKey: cartKey(session), exact: true });
      if (isCurrentSession(session)) await client.invalidateQueries({ queryKey: ['checkout', session.userId] });
    },
  });
}
export function useReorderPreview(id: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['reorder-preview', user?.id, id], queryFn: () => orderApi.reorderPreview(id),
    enabled: !!user, staleTime: 0, refetchOnMount: 'always', retry: false });
}
export function useCancelOrder() {
  const client = useQueryClient();
  const { user } = useAuth();
  return useMutation({ mutationFn: orderApi.cancel, retry: false,
    onSuccess: (result) => client.setQueryData(['order', user?.id, result.order.id], result),
    onSettled: async () => {
      await Promise.all(['order', 'orders', 'seller-orders', 'admin-shipping-all', 'admin-shipping-detail',
        'admin-shipping-ready', 'shipping-operations', 'admin-analytics', 'earnings', 'shop-products', 'shop-product',
        'shop-product-lookup', 'reorder-preview', 'checkout', 'cart', 'notification-inbox']
        .map((key) => client.invalidateQueries({ queryKey: [key] }).catch(() => undefined)));
    },
  });
}
export function usePlaceOrder() {
  const client = useQueryClient();
  const { user, session } = useAuth();
  return useMutation({
    mutationKey: ['place-order', session?.userId, session?.generation],
    mutationFn: async (input: Parameters<typeof orderApi.place>[0]) => {
      assertUserSession(session);
      const result = await orderApi.place(input);
      assertUserSession(session);
      return result;
    },
    retry: false,
    onSuccess: () => {
      if (!isCurrentSession(session)) return;
      // Cache refresh must not turn a successfully saved order into a failed placement.
      void client.invalidateQueries({ queryKey: cartKey(session), exact: true }).catch(() => undefined);
      void client.invalidateQueries({ queryKey: ['orders', user?.id] }).catch(() => undefined);
      void client.invalidateQueries({ queryKey: ['notification-inbox', user?.id] }).catch(() => undefined);
    },
  });
}
export function useOrder(id: string) {
  const { user } = useAuth();
  const focused = useScreenActive();
  return useQuery({ queryKey: ['order', user?.id, id], queryFn: () => orderApi.get(id), enabled: !!user && !!id && focused,
    refetchInterval: focused ? 30000 : false });
}
export function useRequestReturn() {
  const client = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReturnRequestInput }) => orderApi.requestReturn(id, input),
    onSuccess: async () => { await Promise.all([
      client.invalidateQueries({ queryKey: ['orders', user?.id] }),
      client.invalidateQueries({ queryKey: ['order', user?.id] }),
    ]); },
  });
}
export function useConfirmReceived() {
  const client = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: orderApi.confirmReceived,
    onSuccess: async (result) => {
      client.setQueryData(['order', user?.id, result.order.id], result);
      await Promise.all(['orders', 'order', 'seller-orders', 'admin-shipping-all', 'admin-shipping-detail', 'shipping-operations', 'notification-inbox']
        .map((key) => client.invalidateQueries({ queryKey: [key] }).catch(() => undefined)));
    },
  });
}
