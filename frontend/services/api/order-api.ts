import { AddressInput } from './address-api';
import { apiRequest } from './client';
import { LocationCapture } from '../../features/location/location-types';

export type BuyNowItem = { productId: string; color: string; size: string; quantity: number; purchaseId: string };
export type CheckoutAddress = { shippingAddressId: string; billingAddressId: string; buyNow?: BuyNowItem };
export type OrderItem = { productId: string; name: string; price: number; quantity: number; color: string; size: string; coverImage: string | null };
export type OrderCancellation = { reason: string; at: string; actorRole: 'customer' };
export type ReorderPreview = {
  items: { productId: string; color: string; size: string; name: string; price: number | null;
    coverImage: string | null; stock: number; maxQuantity: number; available: boolean; reason: string | null }[];
  delivery: { pincode: string; serviceable: boolean; restricted: boolean; message: string };
};
export type CheckoutQuote = {
  expectedDispatchDate?: string | null; deliveryEta?: string | null; dispatchDelayReason?: string | null;
  checkoutKey: string;
  items: OrderItem[];
  shippingAddress: AddressInput;
  billingAddress: AddressInput;
  subtotal: number;
  delivery: number;
  total: number;
};
export type Order = Omit<CheckoutQuote, 'checkoutKey'> & {
  id: string;
  canCancel?: boolean;
  cancellation?: OrderCancellation | null;
  fulfillmentVersion?: number;
  fulfillmentStatus?: string;
  fulfillmentTimeline?: import('../../features/orders/fulfillment').FulfillmentStep[];
  shipmentProgress?: (import('../../features/orders/fulfillment').FulfillmentProgress & { packageNumber: number; itemNames: string[] })[];
  outForDeliveryAt?: string | null;
  paymentMethod: 'cod';
  paymentStatus: 'unpaid' | 'paid' | 'cancelled';
  status: string;
  trackingAvailable: boolean;
  createdAt: string;
  expectedDispatchDate: string | null;
  deliveryEta: string | null;
  dispatchDelayReason: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
  returnRequestedAt: string | null;
  returnRequestId: string | null;
  returnPreference: 'refund' | 'exchange' | null;
  returnReason: string | null;
  returnDescription: string | null;
  returnReviewNote: string | null;
  returnReviewedAt: string | null;
  returnCompletedAt: string | null;
  returnReference: string | null;
  returnEligibleUntil: string | null;
  returnCases?: { id: string; status: import('../../features/returns/return-types').ReturnStatus; preference: 'refund' | 'exchange' }[];
};
export type ReturnRequestInput = { preference: 'refund' | 'exchange';
  reason: 'damaged' | 'wrong_item' | 'not_as_described' | 'size_fit' | 'other'; description: string };
export type OrderHistoryTab = 'active' | 'past';
export type OrderPage = { orders: Order[]; nextCursor: string | null };
export const orderApi = {
  quote: (body: CheckoutAddress) => apiRequest<{ quote: CheckoutQuote }>('/orders/quote', { body }),
  place: (body: CheckoutAddress & { checkoutKey: string; paymentMethod: 'cod'; location?: LocationCapture }) => apiRequest<{ order: Order }>('/orders', { body }),
  list: ({ tab, cursor, limit = 20 }: { tab: OrderHistoryTab; cursor?: string; limit?: number }, signal?: AbortSignal) => {
    const params = new URLSearchParams({ tab, limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return apiRequest<OrderPage>(`/orders?${params}`, { method: 'GET', signal });
  },
  get: (id: string) => apiRequest<{ order: Order }>(`/orders/${id}`, { method: 'GET' }),
  cancel: ({ id, reason }: { id: string; reason: string }) => apiRequest<{ order: Order }>(`/orders/${id}/cancel`, { body: { reason } }),
  reorderPreview: (id: string) => apiRequest<ReorderPreview>(`/orders/${id}/reorder`, { method: 'GET' }),
  reorder: ({ id, items }: { id: string; items: { productId: string; color: string; size: string; quantity: number }[] }) => apiRequest<{ message: string }>(`/orders/${id}/reorder`, { body: { items } }),
  requestReturn: (id: string, input: ReturnRequestInput) => apiRequest<{ order: Order }>(`/orders/${id}/return`, { body: input }),
  confirmReceived: (id: string) => apiRequest<{ order: Order }>(`/orders/${id}/received`, {}),
};
