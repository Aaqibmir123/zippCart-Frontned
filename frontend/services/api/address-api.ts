import { apiRequest } from './client';

export type AddressInput = { name: string; phone: string; line1: string; locality: string; district: string; landmark: string; city: string; state: string; pincode: string; label: 'Home' | 'Work' | 'Other' };
export type Address = AddressInput & { id: string };
export const addressApi = {
  list: () => apiRequest<{ addresses: Address[] }>('/addresses', { method: 'GET' }),
  save: ({ id, ...body }: AddressInput & { id?: string }) => apiRequest<{ address: Address }>(id ? `/addresses/${id}` : '/addresses', { method: id ? 'PUT' : 'POST', body }),
  remove: (id: string) => apiRequest<void>(`/addresses/${id}`, { method: 'DELETE' }),
};
