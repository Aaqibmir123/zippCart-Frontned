import { apiRequest } from '../../services/api/client';
import type { Review, ReviewPage, ReviewInput, ReviewAudit } from './review-types';
export const reviewApi = {
  product: (id: string, page: number, sort: string) => apiRequest<ReviewPage>(`/reviews/products/${id}?page=${page}&sort=${sort}`, { method: 'GET', public: true }),
  own: (id: string) => apiRequest<{ reviews: Review[] }>(`/reviews/orders/${id}`, { method: 'GET' }),
  create: (input: ReviewInput) => apiRequest<{ review: Review }>('/reviews', { body: input, timeoutMs: 30000 }),
  helpful: (id: string) => apiRequest<{ review: Review }>(`/reviews/${id}/helpful`),
  workspace: (admin: boolean, page: number, status: string, rating: string, productId: string) => apiRequest<ReviewPage>(
    `/reviews/${admin ? 'admin' : 'seller'}?page=${page}&status=${status}${rating ? `&rating=${rating}` : ''}${productId ? `&productId=${encodeURIComponent(productId)}` : ''}`, { method: 'GET' }),
  reply: (id: string, comment: string, version: number) => apiRequest(`/reviews/seller/${id}/reply`, { body: { comment, version } }),
  moderate: (id: string, action: string, reason: string, version: number) => apiRequest(`/reviews/admin/${id}/moderate`, { body: { action, reason, version } }),
  audit: (id: string) => apiRequest<{ events: ReviewAudit[] }>(`/reviews/admin/${id}/audit`, { method: 'GET' }),
};
