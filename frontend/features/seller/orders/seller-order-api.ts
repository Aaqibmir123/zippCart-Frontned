import { apiRequest } from '../../../services/api/client';
import { OrderItem } from '../../../services/api/order-api';
import { ReturnStatus } from '../../returns/return-types';
import { Operations, OperationsQueue } from '../../orders/operations-model';
import { Settlement } from '../../earnings/settlement-model';

export type SellerOrder = {
  cancellation?: import('../../../services/api/order-api').OrderCancellation | null;
  operations: Operations; settlement: Settlement | null;
  stockIssue?: { open: boolean; note: string; reportedAt: string }; viewedAt?: string | null; expectedDispatchDate?: string | null;
  id: string; items: OrderItem[]; status: 'cancelled' | 'placed' | 'preparing' | 'packed' | 'ready_for_dispatch' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'return_requested' | 'return_approved' | 'return_rejected' | 'return_completed';
  dispatchedAt: string | null; receivedAt: string | null; createdAt: string;
  fulfillmentTimeline?: import('../../orders/fulfillment').FulfillmentStep[];
  returnRequestedAt: string | null; returnPreference: 'refund' | 'exchange' | null;
  returnRequestId: string | null;
  returnReason: string | null; returnDescription: string | null; returnReviewNote: string | null;
  returnReviewedAt: string | null; returnCompletedAt: string | null;
  returnCases?: { id: string; status: ReturnStatus; preference: 'refund' | 'exchange'; reason: string;
    items: { name: string; quantity: number; exchangeColor?: string; exchangeSize?: string }[] }[];
  customer: string; shippingAddress: { name: string; phone: string; line1: string; locality: string; district?: string; landmark?: string; city: string; state: string; pincode: string };
  paymentMethod: 'cod'; paymentStatus: 'unpaid' | 'paid' | 'cancelled'; subtotal: number;
};
export type SellerOrderSummary = {
  totalOrders: number; orderValue: number; pending: number; dispatched: number;
  delivered: number; returnRequests: number;
};
export const sellerOrderApi = {
  viewed: (id: string) => apiRequest(`/seller/orders/${id}/viewed`, {}),
  reportStockIssue: (id: string, note: string) => apiRequest<{ order: SellerOrder }>(`/seller/orders/${id}/stock-issue`, { body: { note } }),
  list: (page: number, queue: OperationsQueue = 'all') => apiRequest<{ orders: SellerOrder[]; summary: SellerOrderSummary; queues: Record<OperationsQueue, number>; total: number; nextPage: number | null }>(`/seller/orders?page=${page}&queue=${queue}`, { method: 'GET' }),
  dispatch: (id: string) => apiRequest<{ order: SellerOrder }>(`/seller/orders/${id}/dispatch`, {}),
  readyForDispatch: (id: string) => apiRequest<{ order: SellerOrder }>(`/seller/orders/${id}/ready`, {}),
  setPreparationStatus: (id: string, status: 'preparing' | 'packed') => apiRequest<{ order: SellerOrder }>(`/seller/orders/${id}/preparation`, { method: 'PATCH', body: { status } }),
};
