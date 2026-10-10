import { apiRequest } from './client';

export type FavoriteRecord = { productId: string };

export const favoritesApi = {
  add: (productId: string) => apiRequest<{ message: string }>(`/favorites/${productId}`, { method: 'PUT' }),
  list: (signal?: AbortSignal) => apiRequest<{ favorites: FavoriteRecord[] }>('/favorites', { method: 'GET', signal }),
  remove: (productId: string) => apiRequest<{ message: string }>(`/favorites/${productId}`, { method: 'DELETE' }),
};
