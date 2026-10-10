import { Order } from '../../services/api/order-api';
import { closedStatuses, statusLabels } from '../returns/return-types';
import { fulfillmentLabels, fulfillmentNotes, currentFulfillment } from './fulfillment';

export const orderDate = (value: string) => new Date(value).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short',
});

export function isActiveOrder(order: Order, now = Date.now()) {
  if (order.status === 'cancelled') return false;
  if (order.returnCases?.some((item) => !closedStatuses.includes(item.status))) return true;
  if (order.receivedAt) {
    if (!order.returnCases?.length && ['return_requested', 'return_approved'].includes(order.status)) return true;
    return now <= new Date(order.receivedAt).getTime() + 24 * 60 * 60 * 1000;
  }
  return !['delivered', 'completed', 'cancelled', 'return_completed', 'return_rejected'].includes(order.status);
}

export function orderStatus(order: Order) {
  const activeCase = order.returnCases?.find((item) => !closedStatuses.includes(item.status));
  if (activeCase) return { label: statusLabels[activeCase.status], note: 'Open your order for return updates', green: false };
  const labels: Record<string, string> = {
    ...fulfillmentLabels, completed: 'Completed',
    cancelled: 'Cancelled', return_requested: 'Return requested', return_approved: 'Return approved',
    return_rejected: 'Return declined', return_completed: order.returnPreference === 'exchange' ? 'Exchange completed' : 'Refund completed',
  };
  const status = currentFulfillment(order);
  const label = labels[status] ?? status.replaceAll('_', ' ');
  const note = status === 'delivered' && order.receivedAt ? `Delivered on ${orderDate(order.receivedAt)}` : fulfillmentNotes[status] ?? label;
  return { label, note, green: ['delivered', 'completed', 'return_completed'].includes(order.status) };
}
