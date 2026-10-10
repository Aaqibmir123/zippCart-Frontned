import { apiRequest } from './client';
import type { ShopProduct } from './product-api';

export type CartRecord = { id: string; productId: string; color: string; size: string; quantity: number; product?: ShopProduct };

export const cartApi = {
  addItem: (data: { productId: string; color: string; size: string; quantity?: number }) => apiRequest<{ item: CartRecord; message: string }>('/cart/items', { body: { ...data, quantity: data.quantity ?? 1 } }),
  getCart: (signal?: AbortSignal) => apiRequest<{ items: CartRecord[] }>('/cart', { method: 'GET', signal }),
  removeItem: (id: string) => apiRequest<{ message: string }>(`/cart/items/${id}`, { method: 'DELETE' }),
  updateQuantity: (id: string, quantity: number) => apiRequest<{ item: CartRecord | null; message: string }>(`/cart/items/${id}`, { body: { quantity }, method: 'PATCH' }),
};
