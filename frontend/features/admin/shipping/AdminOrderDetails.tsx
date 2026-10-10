import { AppLoader } from '../../../components/AppLoader';
import { OperationsBadges } from '../../orders/OperationsBadges';
import { SettlementBadge } from '../../earnings/SettlementBadge';
import { FulfillmentTimeline } from '../../orders/FulfillmentTimeline';
import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { money } from '../../../utils/money';
import { adminShippingApi, ShippingAddress, ShippingLabel } from './admin-shipping-api';
import { ShippingLabelView } from './ShippingLabelView';
import { OrderLocationCard } from './OrderLocationCard';
import { ss as s } from '../../seller/seller.styles';
import { useScreenActive } from '../../../hooks/useScreenActive';

const address = (value: ShippingAddress) => [value.line1, value.locality, value.landmark, value.city, value.state, value.pincode].filter(Boolean).join(', ');
const date = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
export function AdminOrderDetails({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [label, setLabel] = useState<ShippingLabel | null>(null);
  const [contactError, setContactError] = useState('');
  const active = useScreenActive(!label);
  const query = useQuery({ queryKey: ['admin-shipping-detail', user?.id, orderId], queryFn: () => adminShippingApi.detail(orderId),
    enabled: active && !!user?.roles?.includes('admin'), refetchInterval: active ? 30000 : false });
  const order = query.data?.order;
  async function refresh() {
    await Promise.all(['admin-shipping-detail', 'admin-shipping-ready', 'admin-shipping-all', 'shipping-operations', 'orders', 'order', 'seller-orders'].map((key) => client.invalidateQueries({ queryKey: [key] })));
  }
  const generate = useMutation({ mutationFn: () => order?.label ? adminShippingApi.getLabel(orderId) : adminShippingApi.generateLabel(orderId),
    onSuccess: (result) => { setLabel(result.label); void refresh(); } });
  async function call(phone: string) {
    const clean = phone.replace(/[\s()-]/g, '');
    if (!/^\+?\d{10,15}$/.test(clean)) { setContactError('A valid contact number is unavailable.'); return; }
    try { setContactError(''); await Linking.openURL(`tel:${clean}`); }
    catch { setContactError('Could not open the phone app. Long-press the contact number to copy it.'); }
  }
  const canPrepareLabel = !!order && ['placed', 'dispatched', 'out_for_delivery'].includes(order.status) && !!order.sellers.length && order.sellers.every((seller) => !seller.stockIssueOpen && ['placed', 'preparing', 'packed', 'ready_for_dispatch', 'dispatched', 'out_for_delivery'].includes(seller.status));
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => { if (!label) onClose(); }}>
    <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: '#F5F3FA' }}>
      <View style={[s.between, { padding: 16, backgroundColor: '#fff' }]}><View><Text style={s.kicker}>ADMIN ORDER DETAILS</Text><Text style={s.heading}>#{orderId.slice(-8).toUpperCase()}</Text></View><Pressable accessibilityRole="button" onPress={onClose} style={{ padding: 12 }}><Text style={s.link}>Close</Text></Pressable></View>
      {!!(contactError || generate.error) && <Text accessibilityRole="alert" style={[s.danger, { padding: 12 }]}>{contactError || generate.error?.message}</Text>}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
        {query.isPending ? <AppLoader /> : query.isError || !order ? <Pressable onPress={() => void query.refetch()}><Text style={s.danger}>Could not load order details. Tap to retry.</Text></Pressable> : <>
          <View style={s.hero}><OperationsBadges value={order.operations} /><Text style={s.text}>{date(order.createdAt)} · {order.itemCount} items</Text><Text style={s.heading}>{money(order.total)} · {order.paymentMethod.toUpperCase()}</Text><Text style={s.small}>Payment: {order.paymentStatus}</Text></View>
          {order.cancellation ? <View style={s.card}><Text style={s.title}>Cancelled by customer</Text>
            <Text style={s.text}>{order.cancellation.reason}</Text><Text style={s.small}>{date(order.cancellation.at)} · No COD collection or payout due.</Text>
          </View> : <FulfillmentTimeline order={order} />}
          {!!order.settlements.length && <View style={s.card}><Text style={s.title}>Payout & commission</Text>
            {order.settlements.map((settlement) => <View key={settlement.storeId} style={{ gap: 8 }}>
              <Text style={s.heading}>{order.sellers.find((seller) => seller.storeId === settlement.storeId)?.storeName}</Text>
              <SettlementBadge settlement={settlement} detail admin />
            </View>)}
          </View>}
          {['dispatched', 'out_for_delivery'].includes(order.status) && <View style={s.card}>
            <Text style={s.title}>Awaiting customer confirmation</Text>
            <Text style={s.text}>The customer must tap “I have received my order” in their order details. Only then is the order marked Delivered and the return window opened.</Text>
          </View>}
          {order.status === 'placed' && <Text style={s.small}>Sellers pack their items, then mark dispatched after handing each parcel to you. Delivery becomes available after every seller hands over their parcel.</Text>}
          <View style={s.card}><Text style={s.title}>Customer & delivery</Text><Text style={s.heading}>{order.shippingAddress.name}</Text><Text selectable style={s.text}>{order.shippingAddress.phone}</Text><Text selectable style={s.text}>{address(order.shippingAddress)}</Text><Pressable accessibilityRole="button" style={[s.button, s.secondary]} onPress={() => void call(order.shippingAddress.phone)}><Text style={s.link}>Call customer</Text></Pressable></View>
          <OrderLocationCard location={order.location} />
          <Text style={s.title}>Stores fulfilling this order ({order.sellers.length})</Text>
          {order.sellers.map((seller) => <View key={seller.storeId} style={s.card}>
            <Text style={s.title}>{seller.storeName}</Text><OperationsBadges value={seller.operations} />
            <Text style={s.text}>Seller: {seller.ownerName || 'Name unavailable'}</Text><Text selectable style={s.text}>{seller.phone || 'Contact unavailable'}</Text><Text selectable style={s.small}>{seller.address || 'Address unavailable'}</Text>
            {seller.stockIssueOpen && <Text style={s.danger}>Open stock issue. Resolve it in Attention before dispatch.</Text>}
            {!!seller.phone && <Pressable accessibilityRole="button" style={[s.button, s.secondary]} onPress={() => void call(seller.phone!)}><Text style={s.link}>Call seller</Text></Pressable>}
            {seller.items.map((item, index) => <View key={`${item.productId}:${index}`} style={{ paddingTop: 12, borderTopWidth: 1, borderColor: '#E8E3EF' }}><Text style={s.heading}>{item.name}</Text><Text style={s.small}>{[item.color, item.size].filter(Boolean).join(' / ') || 'Standard'} · Qty {item.quantity}</Text><Text style={s.text}>{money(item.price)} each · {money(item.price * item.quantity)}</Text></View>)}
          </View>)}
          <View style={s.card}><Text style={s.title}>Dispatch & payment</Text><Text style={s.text}>Expected dispatch: {order.expectedDispatchDate ? date(order.expectedDispatchDate) : 'Not scheduled'}</Text><Text style={s.text}>Estimated delivery: {order.deliveryEta ? date(order.deliveryEta) : 'Not available'}</Text>{!!order.dispatchDelayReason && <Text style={s.small}>{order.dispatchDelayReason}</Text>}<Text style={s.text}>Items: {money(order.subtotal)} · Delivery: {money(order.delivery)}</Text><Text style={s.heading}>Total: {money(order.total)}</Text>{order.label && <Text selectable style={s.link}>Label: {order.label.reference}</Text>}</View>
          {order.billingAddress && <View style={s.card}><Text style={s.title}>Billing address</Text><Text style={s.text}>{order.billingAddress.name}</Text><Text selectable style={s.small}>{address(order.billingAddress)}</Text></View>}
        </>}
      </ScrollView>
      {order && (order.label || canPrepareLabel) && <View style={{ padding: 16, gap: 10, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E8E3EF' }}>
        <Pressable accessibilityRole="button" disabled={generate.isPending} style={s.button} onPress={() => generate.mutate()}><Text style={s.buttonText}>{generate.isPending ? 'Preparing label…' : order.label ? 'View / print label' : 'Generate shipping label'}</Text></Pressable>
      </View>}
      {label && <ShippingLabelView label={label} onClose={() => setLabel(null)} />}
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
