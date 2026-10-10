import { apiRequest } from './client';
import { AuthenticatedUser } from './auth-api';
export type ProfileInput = { fullName: string; email: string; profileImage: string | null };
export const profileApi = {
  get: () => apiRequest<{ user: AuthenticatedUser }>('/profile', { method: 'GET' }),
  update: (body: ProfileInput) => apiRequest<{ user: AuthenticatedUser }>('/profile', { method: 'PATCH', body }),
};
