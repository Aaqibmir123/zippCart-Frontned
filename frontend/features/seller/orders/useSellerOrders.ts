import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerOrderApi } from './seller-order-api';
import { OperationsQueue } from '../../orders/operations-model';
import { useScreenActive } from '../../../hooks/useScreenActive';

const key = (ownerId?: string) => ['seller-orders', ownerId];
export function useSellerOrders(ownerId?: string, queue: OperationsQueue = 'all', enabled = true) {
  const active = useScreenActive(enabled);
  return useInfiniteQuery({ queryKey: [...key(ownerId), queue], initialPageParam: 1,
    queryFn: ({ pageParam }) => sellerOrderApi.list(pageParam, queue),
    getNextPageParam: (last) => last.nextPage ?? undefined,
    enabled: active && !!ownerId, refetchOnMount: 'always', refetchInterval: active ? 30000 : false });
}
export function useDispatchSellerOrder(ownerId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: sellerOrderApi.dispatch,
    onSuccess: () => client.invalidateQueries({ queryKey: key(ownerId) }) });
}
export function useReadySellerOrder(ownerId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: sellerOrderApi.readyForDispatch,
    onSuccess: () => client.invalidateQueries({ queryKey: key(ownerId) }) });
}
export function usePreparationStatus(ownerId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: 'preparing' | 'packed' }) => sellerOrderApi.setPreparationStatus(id, status),
    onSuccess: () => client.invalidateQueries({ queryKey: key(ownerId) }) });
}
