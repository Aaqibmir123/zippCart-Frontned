import { AppLoader } from '../../components/AppLoader';
import { FulfillmentTimeline } from '../orders/FulfillmentTimeline';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SellerOrder } from './orders/seller-order-api';
import { sellerOrderApi } from './orders/seller-order-api';
import { StockIssueForm } from './orders/StockIssueForm';
import { useMutation } from '@tanstack/react-query';
import { useDispatchSellerOrder } from './orders/useSellerOrders';
import { money } from '../../utils/money';
import { statusLabels } from '../returns/return-types';
import { OperationsBadges } from '../orders/OperationsBadges';
import { OrderQueueFilters } from '../orders/OrderQueueFilters';
import { OperationsQueue, operationsTone } from '../orders/operations-model';
import { SettlementBadge } from '../earnings/SettlementBadge';
import { s } from './orders/seller-orders.styles';

const dateTime = (value: string) => new Date(value).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});
const dispatchDayKey = (value: Date) => new Date(value.getTime() + 330 * 60000).toISOString().slice(0, 10);
const dispatchDayLabel = (value: string) => new Date(value).toLocaleDateString('en-IN', {
  timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
const reasons: Record<string, string> = { damaged: 'Damaged or defective', wrong_item: 'Wrong item received',
  not_as_described: 'Not as described', size_fit: 'Size or fit issue', other: 'Other reason' };

function OrderDetail({ order, pending, error, onBack, onDispatch }: {
  order: SellerOrder; pending: boolean; error?: string; onBack: () => void; onDispatch: () => void;
}) {
  const scheduledForLater = !!order.expectedDispatchDate &&
    dispatchDayKey(new Date(order.expectedDispatchDate)) > dispatchDayKey(new Date());
  const stockBlocked = !!order.stockIssue?.open;
  const address = order.shippingAddress;
  const addressText = [address.line1, address.locality, address.landmark, address.district, address.city,
    address.state, address.pincode].filter(Boolean).join(', ');
  return <>
    <Pressable accessibilityRole="button" onPress={onBack} style={s.back}><Text style={s.link}>← All orders</Text></Pressable>
    <View style={s.hero}><Text style={s.kicker}>ORDER #{order.id.slice(-8).toUpperCase()}</Text>
      <Text selectable style={s.fullId}>{order.id.toUpperCase()}</Text>
      <OperationsBadges value={order.operations} /><Text style={s.heroDate}>Placed {dateTime(order.createdAt)}</Text></View>
    {order.cancellation && <View style={s.card}><Text style={s.title}>Cancelled by customer</Text>
      <Text style={s.muted}>{dateTime(order.cancellation.at)}</Text><Text style={s.fieldValue}>{order.cancellation.reason}</Text>
      <Text style={s.hint}>Stock restored. No dispatch, COD collection or payout is due.</Text></View>}
    <View style={s.card}><View style={s.cardHead}><Text style={s.title}>{order.status === 'cancelled' ? 'Cancelled items' : 'Items to fulfil'}</Text>
      <Text style={s.count}>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</Text></View>
      {order.items.map((item, index) => <View key={`${item.productId}-${index}`} style={[s.item, index > 0 && s.divider]}>
        <View style={s.photo}>{item.coverImage ? <Image source={{ uri: item.coverImage }} style={s.image} />
          : <Text style={s.photoText}>ITEM</Text>}</View>
        <View style={s.flex}><Text style={s.itemName}>{item.name}</Text>
          {!!item.color && <Text style={s.muted}>Color: {item.color}</Text>}
          {!!item.size && <Text style={s.muted}>Size: {item.size}</Text>}
          <Text style={s.muted}>{money(item.price)} × {item.quantity}</Text></View>
        <Text style={s.lineTotal}>{money(item.price * item.quantity)}</Text></View>)}
      <View style={s.totalRow}><Text style={s.totalLabel}>Your items total</Text>
        <Text style={s.total}>{money(order.subtotal)}</Text></View></View>
    <View style={s.card}><Text style={s.title}>Customer & delivery</Text>
      <Text style={s.fieldLabel}>DELIVER TO</Text><Text style={s.fieldValue}>{order.customer}</Text>
      <Text style={s.address}>{addressText}</Text>
      <Text selectable style={s.fieldValue}>Phone: {address.phone}</Text></View>
    <View style={s.card}><Text style={s.title}>Payment</Text>
      <View style={s.between}><Text style={s.muted}>Method</Text><Text style={s.fieldValue}>Cash on delivery</Text></View>
      <View style={s.between}><Text style={s.muted}>Status</Text><Text style={s.fieldValue}>
        {order.status === 'cancelled' ? 'Cancelled · No payment due' : order.paymentStatus === 'paid' ? 'Marked paid' : 'Payment not confirmed'}</Text></View>
      <Text style={s.hint}>Total above includes only your products in this order.</Text></View>
    {order.status !== 'cancelled' && <FulfillmentTimeline order={order} />}
    {!!order.expectedDispatchDate && <View style={s.card}>
      <Text style={s.title}>Scheduled dispatch</Text>
      <Text style={s.fieldValue}>{dispatchDayLabel(order.expectedDispatchDate)}</Text>
      {scheduledForLater && <Text style={s.hint}>Dispatch becomes available on this day. Orders cannot be handed over before their scheduled date.</Text>}
    </View>}
    {stockBlocked && <View style={s.dispatchWarning}>
      <Text style={s.dispatchWarningTitle}>Dispatch is blocked by a stock issue</Text>
      <Text style={s.dispatchWarningText}>{order.stockIssue?.note}</Text>
      <Text style={s.dispatchWarningText}>Admin must resolve the issue before handover.</Text>
    </View>}
    {order.settlement && <View style={s.card}><Text style={s.title}>Payout status</Text><SettlementBadge settlement={order.settlement} detail /></View>}
    {['placed', 'preparing', 'packed', 'ready_for_dispatch'].includes(order.status) && <Text style={s.hint}>Pack all items, then hand the parcel to admin and mark dispatched. The customer confirms receipt from their order details.</Text>}
    {order.returnRequestedAt && <View style={[s.card, s.returnCard]}><Text style={s.title}>Return case</Text>
      {!!order.returnRequestId && <Text selectable style={s.requestId}>Request ID: {order.returnRequestId}</Text>}
      <Text style={s.muted}>Customer prefers {order.returnPreference === 'exchange' ? 'an exchange' : order.returnPreference === 'refund' ? 'a refund' : 'a return'}</Text>
      <Text style={s.fieldValue}>Reason: {reasons[order.returnReason ?? ''] ?? order.returnReason ?? 'Not provided'}</Text>
      {!!order.returnDescription && <Text style={s.fieldValue}>{order.returnDescription}</Text>}
      {!!order.returnReviewNote && <Text style={s.muted}>Admin note: {order.returnReviewNote}</Text>}
      {!!order.returnReviewedAt && <Text style={s.muted}>Reviewed {dateTime(order.returnReviewedAt)}</Text>}
      {!!order.returnCompletedAt && <Text style={s.muted}>Completed {dateTime(order.returnCompletedAt)}</Text>}
      <Text style={s.hint}>Admin reviews and closes return cases.</Text></View>}
    {order.returnCases?.map((record) => <View key={record.id} style={[s.card, s.returnCard]}>
      <Text style={s.title}>{record.preference === 'refund' ? 'Refund' : 'Exchange'} request</Text>
      <Text selectable style={s.requestId}>RET-{record.id.toUpperCase()}</Text>
      <Text style={s.fieldValue}>{statusLabels[record.status]}</Text>
      <Text style={s.muted}>{reasons[record.reason] ?? record.reason}</Text>
      {record.items.map((item, index) => <Text key={index} style={s.fieldValue}>
        {item.name} x {item.quantity}{record.preference === 'exchange'
          ? ` · ${[item.exchangeColor, item.exchangeSize].filter(Boolean).join(' / ') || 'Same variant'}` : ''}</Text>)}
    </View>)}
    {['placed', 'preparing', 'packed', 'ready_for_dispatch'].includes(order.status) && <Pressable accessibilityRole="button" disabled={pending || scheduledForLater || stockBlocked} onPress={onDispatch} style={[s.button, (scheduledForLater || stockBlocked) && s.disabledButton]}>
      {pending ? <AppLoader color="#fff" /> : <Text style={s.buttonText}>Mark Dispatched</Text>}</Pressable>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <StockIssueForm order={order} />
  </>;
}

export function SellerOrders({ orders, ownerId, refreshing, onRefresh, hasMore, loadingMore, onLoadMore, queue, queues, onQueue }: {
  queue: OperationsQueue; queues?: Partial<Record<OperationsQueue, number>>; onQueue: (value: OperationsQueue) => void;
  orders: SellerOrder[]; ownerId?: string; refreshing: boolean; onRefresh: () => void;
  hasMore: boolean; loadingMore: boolean; onLoadMore: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dispatch = useDispatchSellerOrder(ownerId);
  const viewed = useMutation({ mutationFn: sellerOrderApi.viewed });
  const selected = orders.find((order) => order.id === selectedId);
  function markDispatched(id: string) {
    Alert.alert('Confirm handover to admin', 'Mark dispatched only after you have packed every item and handed this parcel to admin for delivery.', [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Mark Dispatched', onPress: () => void dispatch.mutateAsync(id).catch(() => undefined) },
    ]);
  }
  return <ScrollView contentContainerStyle={s.content}>
    {viewed.isError && <Pressable onPress={() => selectedId && viewed.mutate(selectedId)}><Text style={s.error}>Could not mark order viewed. Tap to retry.</Text></Pressable>}
    {selected ? <OrderDetail order={selected} pending={dispatch.isPending} error={dispatch.error?.message}
      onBack={() => setSelectedId(null)} onDispatch={() => markDispatched(selected.id)} /> : <>
      <View style={s.header}><View style={s.flex}><Text style={s.kicker}>SALES & FULFILMENT</Text>
        <Text style={s.pageTitle}>Customer orders</Text><Text style={s.muted}>Orders containing your store's products</Text></View>
        <Pressable accessibilityRole="button" onPress={onRefresh} disabled={refreshing} style={s.refresh}>
          <Text style={s.link}>{refreshing ? 'Refreshing…' : 'Refresh'}</Text></Pressable></View>
      <OrderQueueFilters selected={queue} counts={queues} onSelect={onQueue} />
      {orders.map((order, index) => <Pressable key={order.id} accessibilityRole="button"
        accessibilityLabel={`View order ${order.id.slice(-8)}`} onPress={() => { setSelectedId(order.id); viewed.mutate(order.id); }} style={[s.preview, { borderLeftWidth: 4, borderLeftColor: operationsTone(order.operations).color, backgroundColor: operationsTone(order.operations).bg }]}>
        <View style={s.between}><Text style={s.orderId}>{index + 1}. #{order.id.slice(-8).toUpperCase()}</Text><OperationsBadges value={order.operations} /></View>
        {!!order.returnRequestId && <Text style={s.requestId}>Return ID: {order.returnRequestId}</Text>}
        {order.returnCases?.map((record) => <Text key={record.id} style={s.requestId}>
          {record.preference === 'refund' ? 'Refund' : 'Exchange'}: {statusLabels[record.status]}</Text>)}
        <Text style={s.previewDate}>{dateTime(order.createdAt)}</Text>
        <View style={s.previewMiddle}><View style={s.photo}>{order.items[0]?.coverImage
          ? <Image source={{ uri: order.items[0].coverImage }} style={s.image} /> : <Text style={s.photoText}>ITEM</Text>}</View>
          <View style={s.flex}><Text style={s.customer}>{order.customer}</Text>
            <Text numberOfLines={2} style={s.previewItems}>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</Text></View></View>
        {!!(order.returnRequestedAt || order.receivedAt || order.dispatchedAt) && <View style={s.milestone}>
          <View style={[s.milestoneDot, order.returnRequestedAt && s.returnDot]} />
          <Text style={s.milestoneText}>{order.returnCompletedAt ? `Return completed ${dateTime(order.returnCompletedAt)}`
            : order.returnReviewedAt ? `Admin reviewed ${dateTime(order.returnReviewedAt)}`
              : order.returnRequestedAt ? `Return requested ${dateTime(order.returnRequestedAt)}`
            : order.receivedAt ? `Customer received ${dateTime(order.receivedAt)}`
              : `Dispatched ${dateTime(order.dispatchedAt!)}`}</Text></View>}
        {order.settlement && <SettlementBadge settlement={order.settlement} />}
        <View style={s.previewFoot}><Text style={s.total}>{money(order.subtotal)}</Text>
          <Text style={s.link}>View details  →</Text></View></Pressable>)}
      {!orders.length && <View style={s.emptyCard}><Text style={s.title}>No orders in this category</Text>
        <Text style={s.muted}>Choose another category or refresh for updates.</Text></View>}
      {hasMore && <Pressable accessibilityRole="button" disabled={loadingMore} onPress={onLoadMore} style={s.button}>
        {loadingMore ? <AppLoader color="#fff" /> : <Text style={s.buttonText}>Load more orders</Text>}</Pressable>}
    </>}
  </ScrollView>;
}
