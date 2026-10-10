import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cartApi } from '../api/cart-api';
import type { QueryClient } from '@tanstack/react-query';
import type { CartRecord } from '../api/cart-api';
import { useAuth } from '../../context/AuthContext';
import { assertUserSession, isCurrentSession, type SessionScope } from '../auth/session-scope';

export const cartQueryKey = ['cart'] as const;
export const cartKey = (session: SessionScope | null) => [...cartQueryKey, session?.userId, session?.generation] as const;
const cartMutationKey = (session: SessionScope | null) => ['cart-write', session?.userId, session?.generation] as const;
type CartData = { items: CartRecord[] };

export function useCartPending() {
  const { session } = useAuth();
  return useIsMutating({ mutationKey: cartMutationKey(session) }) > 0;
}

function cartMutationOptions(client: QueryClient, session: SessionScope | null) {
  return {
    mutationKey: cartMutationKey(session),
    // All cart writers share a queue, including mutations from other screens.
    scope: { id: `cart-write:${session?.generation}` },
    onMutate: async () => {
      assertUserSession(session);
      await client.cancelQueries({ queryKey: cartKey(session), exact: true });
      assertUserSession(session);
    },
    onSettled: async () => {
      // This callback still counts as pending. Let the last writer reconcile.
      if (isCurrentSession(session) && client.isMutating({ mutationKey: cartMutationKey(session) }) === 1) {
        await client.invalidateQueries({ queryKey: cartKey(session), exact: true }).catch(() => undefined);
      }
    },
  };
}

async function updateCachedCart(client: QueryClient, session: SessionScope | null, update: (items: CartRecord[]) => CartRecord[]) {
  if (!isCurrentSession(session)) return;
  // Also stop reads started while the mutation was awaiting its response.
  await client.cancelQueries({ queryKey: cartKey(session), exact: true });
  if (!isCurrentSession(session)) return;
  client.setQueryData<CartData>(cartKey(session), (current) => current
    ? { ...current, items: update(current.items) }
    : undefined);
}

export function useCart() {
  const { session } = useAuth();
  const pending = useCartPending();
  return useQuery({
    queryKey: cartKey(session),
    queryFn: async ({ signal }) => {
      assertUserSession(session);
      const result = await cartApi.getCart(signal);
      assertUserSession(session);
      return result;
    },
    enabled: isCurrentSession(session) && !!session.userId && !pending,
    staleTime: 30_000,
  });
}

export function useAddCartItem() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    ...cartMutationOptions(queryClient, session),
    mutationFn: async (input: Parameters<typeof cartApi.addItem>[0]) => {
      assertUserSession(session);
      const result = await cartApi.addItem(input);
      assertUserSession(session);
      return result;
    },
    onSuccess: ({ item }) => updateCachedCart(queryClient, session, (items) => {
      const existingIndex = items.findIndex((entry) => entry.id === item.id);
      if (existingIndex === -1) return [...items, item];
      return items.map((entry) => {
        if (entry.id !== item.id) return entry;
        return entry.product ? { ...item, product: entry.product } : item;
      });
    }),
  });
}

export function useUpdateCartQuantity() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    ...cartMutationOptions(queryClient, session),
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      assertUserSession(session);
      const result = await cartApi.updateQuantity(id, quantity);
      assertUserSession(session);
      return result;
    },
    onMutate: async ({ id, quantity }) => {
      assertUserSession(session);
      await queryClient.cancelQueries({ queryKey: cartKey(session), exact: true });
      assertUserSession(session);
      // TanStack runs onMutate even for queued writes. Queued writes use their
      // response rather than a snapshot of an earlier optimistic quantity.
      if (queryClient.isMutating({ mutationKey: cartMutationKey(session) }) > 1) return;
      const previous = queryClient.getQueryData<CartData>(cartKey(session))?.items.find((entry) => entry.id === id);
      if (!previous) return;
      queryClient.setQueryData<CartData>(cartKey(session), (current) => current && {
        ...current,
        items: current.items.map((entry) => entry.id === id ? { ...entry, quantity } : entry),
      });
      return { previousQuantity: previous.quantity };
    },
    onError: async (_error, { id, quantity }, context) => {
      if (!context) return;
      await updateCachedCart(queryClient, session, (items) => items.map((entry) =>
        entry.id === id && entry.quantity === quantity
          ? { ...entry, quantity: context.previousQuantity }
          : entry));
    },
    onSuccess: ({ item }, { id }) => updateCachedCart(queryClient, session, (items) => item
      ? items.map((entry) => {
        if (entry.id !== id) return entry;
        return entry.product ? { ...item, product: entry.product } : item;
      })
      : items.filter((entry) => entry.id !== id)),
  });
}

export function useRemoveCartItem() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    ...cartMutationOptions(queryClient, session),
    mutationFn: async (id: string) => {
      assertUserSession(session);
      const result = await cartApi.removeItem(id);
      assertUserSession(session);
      return result;
    },
    onSuccess: (_result, id) => updateCachedCart(queryClient, session, (items) => items.filter((entry) => entry.id !== id)),
  });
}
