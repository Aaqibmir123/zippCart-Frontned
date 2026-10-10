import { apiRequest } from '../../../services/api/client';

export type ReadyOrder = import('../../orders/fulfillment').FulfillmentProgress & {
  cancellation?: import('../../../services/api/order-api').OrderCancellation | null;
  operations: import('../../orders/operations-model').Operations;
  settlements: (import('../../earnings/settlement-model').Settlement & { storeId: string })[];
  receivedAt: string | null; id: string; status: string; createdAt: string; itemCount: number; total: number; paymentMethod: string; label: ShippingLabel | null; customerName?: string; storeNames?: string[] };
export type ShippingItem = { name: string; color?: string; size?: string; quantity: number; price: number; productId: string };
export type ShippingAddress = { name: string; phone: string; line1: string; locality: string; district?: string; landmark?: string; city: string; state: string; pincode: string };
export type AdminOrderDetail = ReadyOrder & { shippingAddress: ShippingAddress; billingAddress?: ShippingAddress; subtotal: number; delivery: number; paymentStatus: string;
  location?: import('../../location/location-types').OrderLocation;
  expectedDispatchDate?: string; deliveryEta?: string; dispatchDelayReason?: string;
  sellers: { operations: import('../../orders/operations-model').Operations; storeId: string; storeName: string; ownerName: string | null; phone: string | null; address: string | null; status: string; stockIssueOpen?: boolean; items: ShippingItem[] }[] };
export type ShippingLabel = { reference: string; generatedAt: string; orderId: string; orderDate: string;
  customer: { name: string; phone: string; address: string }; itemCount: number; packages: number;
  payment: string; collectAmount: number; qrValue: string; items?: Pick<ShippingItem, 'name' | 'color' | 'size' | 'quantity'>[] };

export const adminShippingApi = {
  all: (page = 1, queue: import('../dashboard/dashboard-api').OrderQueue = 'all') => apiRequest<{ orders: ReadyOrder[]; total: number; nextPage: number | null }>(`/admin/shipping/orders?page=${page}&queue=${queue}`, { method: 'GET' }),
  detail: (id: string) => apiRequest<{ order: AdminOrderDetail }>(`/admin/shipping/${id}`, { method: 'GET' }),
  transit: (page = 1) => apiRequest<{ orders: ReadyOrder[]; nextPage: number | null }>(`/admin/shipping/in-transit?page=${page}`, { method: 'GET' }),
  attention: (page = 1) => apiRequest<{ orders: AttentionOrder[]; nextPage: number | null }>(`/admin/shipping/attention?page=${page}`, { method: 'GET' }),
  resolve: (id: string, storeId: string, note: string) => apiRequest(`/admin/shipping/${id}/resolve-issue`, { body: { storeId, note } }),
  settings: () => apiRequest<{ settings: DispatchSettings }>('/admin/settings/dispatch', { method: 'GET' }),
  updateSettings: (settings: DispatchSettings) => apiRequest('/admin/settings/dispatch', { method: 'PATCH', body: settings }),
  ready: (page = 1) => apiRequest<{ orders: ReadyOrder[]; total: number; nextPage: number | null }>(`/admin/shipping/ready?page=${page}`, { method: 'GET' }),
  generateLabel: (id: string) => apiRequest<{ label: ShippingLabel }>(`/admin/shipping/${id}/label`, { method: 'POST' }),
  getLabel: (id: string) => apiRequest<{ label: ShippingLabel }>(`/admin/shipping/${id}/label`, { method: 'GET' }),
  dispatch: (id: string) => apiRequest<{ order: ReadyOrder }>(`/admin/shipping/${id}/dispatch`, { method: 'POST' }),
};
export type AttentionOrder = ReadyOrder & { reasons: string[]; issues: { storeId: string; note: string }[] };
export type DispatchSettings = { cutoffMinutes: number; weeklyOffDays: number[]; holidays: string[]; sameDayEnabled: boolean; defaultEtaDays: number; lowStockThreshold: number };
