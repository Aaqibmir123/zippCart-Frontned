import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { favoritesApi } from '../api/favorites-api';
import { useAuth } from '../../context/AuthContext';
import { assertUserSession, isCurrentSession, type SessionScope } from '../auth/session-scope';

export const favoritesQueryKey = ['favorites'] as const;
export const favoritesKey = (session: SessionScope | null) => [...favoritesQueryKey, session?.userId, session?.generation] as const;

export function useFavorites() {
  const { session } = useAuth();
  return useQuery({
    queryKey: favoritesKey(session),
    queryFn: async ({ signal }) => {
      assertUserSession(session);
      const result = await favoritesApi.list(signal);
      assertUserSession(session);
      return result;
    },
    enabled: isCurrentSession(session) && !!session.userId,
    staleTime: 60_000,
  });
}

export function useToggleFavorite() {
  const { session } = useAuth();
  const key = favoritesKey(session);
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['favorites-write', session?.userId, session?.generation],
    mutationFn: async ({ isFavorite, productId }: { isFavorite: boolean; productId: string }) => {
      assertUserSession(session);
      const result = await (isFavorite ? favoritesApi.remove(productId) : favoritesApi.add(productId));
      assertUserSession(session);
      return result;
    },
    onMutate: async ({ isFavorite, productId }) => {
      assertUserSession(session);
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      assertUserSession(session);
      const previous = queryClient.getQueryData<{ favorites: { productId: string }[] }>(key);
      const previousIndex = previous?.favorites.findIndex((item) => item.productId === productId) ?? -1;
      queryClient.setQueryData<{ favorites: { productId: string }[] }>(key, (current) => {
        if (!current) return current;
        const favorites = current.favorites.filter((item) => item.productId !== productId);
        return { ...current, favorites: isFavorite ? favorites : [...favorites, { productId }] };
      });
      return { previousIndex };
    },
    onError: (_error, { productId }, context) => {
      if (context && isCurrentSession(session)) queryClient.setQueryData<{ favorites: { productId: string }[] }>(key, (current) => {
        if (!current) return current;
        const favorites = current.favorites.filter((item) => item.productId !== productId);
        if (context.previousIndex < 0) return { ...current, favorites };
        favorites.splice(Math.min(context.previousIndex, favorites.length), 0, { productId });
        return { ...current, favorites };
      });
    },
    onSettled: () => {
      if (isCurrentSession(session)) void queryClient.invalidateQueries({ queryKey: key, exact: true }).catch(() => undefined);
    },
  });
}
