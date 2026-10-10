import { AppLoader } from '../../components/AppLoader';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OrderFlowHeader } from '../../features/orders/OrderFlowHeader';
import { orderTheme as t } from '../../features/orders/order-theme';
import { OrderReturns } from '../../features/returns/OrderReturns';
import { ShopStackParamList } from '../../navigation/user/shop-routes';
import { useConfirmReceived, useOrder } from '../../services/orders/order-queries';
import { colors } from '../../theme';
import { money } from '../../utils/money';
import { orderStatus } from '../../features/orders/order-presentation';
import { FulfillmentTimeline } from '../../features/orders/FulfillmentTimeline';
import { fulfillmentLabel } from '../../features/orders/fulfillment';
import { OrderReviews } from '../../features/reviews/OrderReviews';
import { CustomerOrderActions } from '../../features/orders/CustomerOrderActions';
import { ReorderSheet } from '../../components/shop/orders/ReorderSheet';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useDeadlineClock } from '../../hooks/useDeadlineClock';

type Props = NativeStackScreenProps<ShopStackParamList, 'OrderDetails'>;
const dateTime = (value: string) => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const returnReasons: Record<string, string> = { damaged: 'Damaged or defective', wrong_item: 'Wrong item received',
  not_as_described: 'Not as described', size_fit: 'Size or fit issue', other: 'Other reason' };

export function OrderDetailsScreen({ navigation, route }: Props) {
  const theme = useAppTheme();
  const query = useOrder(route.params.orderId);
  const receipt = useConfirmReceived();
  const [buyAgain, setBuyAgain] = useState(false);
  const order = query.data?.order;
  const now = useDeadlineClock(order?.returnEligibleUntil);
  if (query.isPending) return <SafeAreaView style={[s.center, { backgroundColor: theme.colors.background }]}><AppLoader color={theme.colors.primary} /></SafeAreaView>;
  if (query.isError || !order) return <SafeAreaView style={[s.center, { backgroundColor: theme.colors.background }]}>
    <Text style={[s.muted, { color: theme.colors.muted }]}>Order details could not be loaded.</Text>
    <Pressable onPress={() => void query.refetch()}><Text style={[s.link, { color: theme.colors.primary }]}>Try again</Text></Pressable>
    <Pressable onPress={navigation.goBack}><Text style={[s.link, { color: theme.colors.primary }]}>Back to orders</Text></Pressable>
  </SafeAreaView>;
  const currentOrder = order;
  function confirmReceipt() {
    Alert.alert('Confirm delivery', 'Only confirm after you have received every item in this order. Your 24-hour return window starts now.', [
      { text: 'Not yet', style: 'cancel' },
      { text: 'I received it', onPress: () => void receipt.mutateAsync(currentOrder.id).catch(() => undefined) },
    ]);
  }
  const address = order.shippingAddress;
  return <SafeAreaView edges={['top']} style={[s.page, { backgroundColor: theme.colors.background }]}>
    <OrderFlowHeader title="Order details" subtitle="Delivery, returns & exchanges" onBack={navigation.goBack} />
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={[s.content, { backgroundColor: theme.colors.background }]} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={theme.colors.primary} />}>
      <View style={[s.hero, { backgroundColor: theme.colors.raised }]}><Text style={[s.kicker, { color: theme.colors.primary }]}>ORDER ID</Text><Text selectable style={[s.orderId, { color: theme.colors.text }]}>{order.id.toUpperCase()}</Text>
        <Text style={[s.status, { color: theme.colors.primary }]}>{orderStatus(order).label}</Text>
        <Text style={[s.muted, { color: theme.colors.muted }]}>Placed {dateTime(order.createdAt)}</Text></View>
      <CustomerOrderActions order={order} onBuyAgain={() => setBuyAgain(true)} />
      {order.status !== 'cancelled' && <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[s.title, { color: theme.colors.text }]}>Delivery progress</Text>
        <Text style={[s.muted, { color: theme.colors.muted }]}>Updates automatically every 30 seconds. Pull down to refresh.</Text>
        <Text style={[s.schedule, { color: theme.colors.text }]}>Expected dispatch: {order.expectedDispatchDate ? dateTime(order.expectedDispatchDate) : 'Pending'}</Text>
        {!!order.deliveryEta && <Text style={[s.muted, { color: theme.colors.muted }]}>Estimated delivery: {dateTime(order.deliveryEta)}</Text>}
        {!!order.dispatchDelayReason && <Text style={s.delay}>{order.dispatchDelayReason}</Text>}
        {order.trackingAvailable ? <>
          <FulfillmentTimeline order={order} />
          {(order.shipmentProgress?.length ?? 0) > 1 && <View style={{ gap: 10 }}>
            <Text style={[s.name, { color: theme.colors.text }]}>Updates by package</Text><Text style={[s.muted, { color: theme.colors.muted }]}>The overall status follows the least advanced package.</Text>
            {order.shipmentProgress?.map((shipment) => <View key={shipment.packageNumber} style={s.returnNotice}>
              <Text style={[s.name, { color: theme.colors.text }]}>Package {shipment.packageNumber} ? {fulfillmentLabel(shipment.fulfillmentStatus ?? 'placed')}</Text>
              <Text style={[s.muted, { color: theme.colors.muted }]}>{shipment.itemNames.join(', ')}</Text>
            </View>)}
          </View>}
          {['dispatched', 'out_for_delivery'].includes(order.status) && !order.receivedAt && <Pressable accessibilityRole="button" disabled={receipt.isPending} onPress={confirmReceipt} style={[s.primary, { backgroundColor: theme.colors.primary }]}>
            {receipt.isPending ? <AppLoader color="#fff" /> : <Text style={s.primaryText}>I have received my order</Text>}
          </Pressable>}
          {!!receipt.error && <Text accessibilityRole="alert" style={s.error}>{receipt.error.message}</Text>}
          {!order.receivedAt && <Text style={[s.muted, { color: theme.colors.muted }]}>Return time starts only when delivery is confirmed.</Text>}
          {order.returnRequestedAt ? <View style={[s.returnNotice, { backgroundColor: theme.colors.raised }]}>
              <Text style={s.returnTitle}>{order.status === 'return_completed'
                ? `${order.returnPreference === 'exchange' ? 'Exchange' : 'Refund'} completed`
                : order.status === 'return_rejected' ? 'Return request declined'
                  : order.status === 'return_approved' ? 'Return request approved' : 'Under admin review'}</Text>
              {!!order.returnRequestId && <Text selectable style={[s.requestId, { color: theme.colors.primary }]}>Request ID: {order.returnRequestId}</Text>}
              <Text style={[s.muted, { color: theme.colors.muted }]}>{order.returnPreference === 'exchange' ? 'Exchange requested' : order.returnPreference === 'refund' ? 'Refund requested' : 'Return requested'} · {dateTime(order.returnRequestedAt)}</Text>
              {!!order.returnReason && <Text style={[s.muted, { color: theme.colors.muted }]}>Reason: {returnReasons[order.returnReason] ?? order.returnReason}</Text>}
              {!!order.returnDescription && <Text style={[s.muted, { color: theme.colors.muted }]}>Your details: {order.returnDescription}</Text>}
              {!!order.returnReviewedAt && <Text style={[s.muted, { color: theme.colors.muted }]}>Reviewed {dateTime(order.returnReviewedAt)}</Text>}
              {!!order.returnReviewNote && <Text style={[s.muted, { color: theme.colors.muted }]}>Admin note: {order.returnReviewNote}</Text>}
              {!!order.returnCompletedAt && <Text style={[s.muted, { color: theme.colors.muted }]}>Marked complete {dateTime(order.returnCompletedAt)}</Text>}
              {!!order.returnReference && <Text selectable style={[s.muted, { color: theme.colors.muted }]}>Reference: {order.returnReference}</Text>}
            </View>
            : null}
        </> : <Text style={[s.muted, { color: theme.colors.muted }]}>Live tracking is unavailable for this older order.</Text>}
      </View>
      }
      <OrderReturns order={order} now={now} />
      <OrderReviews order={order} />
      <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[s.title, { color: theme.colors.text }]}>Items ({order.items.length})</Text>
        {order.items.map((item, index) => <View key={`${item.productId}-${item.color}-${item.size}-${index}`} style={[s.item, { borderBottomColor: theme.colors.border }]}>
          {item.coverImage ? <Image source={{ uri: item.coverImage }} style={s.image} /> : <View style={s.image} />}
          <View style={s.itemCopy}><Text style={[s.name, { color: theme.colors.text }]}>{item.name}</Text>
            <Text style={[s.muted, { color: theme.colors.muted }]}>{[item.color, item.size, `Qty ${item.quantity}`].filter(Boolean).join(' · ')}</Text>
            <Text style={[s.value, { color: theme.colors.text }]}>{money(item.price)} each</Text></View>
          <Text style={[s.value, { color: theme.colors.text }]}>{money(item.price * item.quantity)}</Text>
        </View>)}
      </View>
      <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[s.title, { color: theme.colors.text }]}>Delivery address</Text><Text style={[s.name, { color: theme.colors.text }]}>{address.name}</Text>
        <Text style={[s.muted, { color: theme.colors.muted }]}>{[address.line1, address.locality, address.landmark, address.district, address.city, address.state, address.pincode].filter(Boolean).join(', ')}</Text>
        <Text style={[s.muted, { color: theme.colors.muted }]}>+91 {address.phone}</Text></View>
      <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[s.title, { color: theme.colors.text }]}>Payment summary</Text>
        <View style={s.row}><Text style={[s.muted, { color: theme.colors.muted }]}>Items</Text><Text style={[s.value, { color: theme.colors.text }]}>{money(order.subtotal)}</Text></View>
        <View style={s.row}><Text style={[s.muted, { color: theme.colors.muted }]}>Delivery</Text><Text style={[s.value, { color: theme.colors.text }]}>{order.delivery ? money(order.delivery) : 'Free'}</Text></View>
        <View style={s.row}><Text style={[s.name, { color: theme.colors.text }]}>Total</Text><Text style={[s.total, { color: theme.colors.text }]}>{money(order.total)}</Text></View>
        <Text style={[s.muted, { color: theme.colors.muted }]}>{order.status === 'cancelled' ? 'Cancelled · No payment due' : `Cash on delivery · ${order.paymentStatus === 'paid' ? 'Paid' : order.receivedAt ? 'Payment not verified' : 'Pay on delivery'}`}</Text></View>
    </ScrollView>
    {buyAgain && <ReorderSheet order={order} onClose={() => setBuyAgain(false)} onAdded={() => {
      setBuyAgain(false); navigation.navigate('ShopTabs', { screen: 'Cart' });
    }} />}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: t.background }, content: { padding: 18, paddingBottom: 36, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  hero: { backgroundColor: t.tint, padding: 20, borderRadius: 20, gap: 6 },
  kicker: { color: t.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  orderId: { color: t.ink, fontSize: 17, fontWeight: '900' },
  status: { color: t.primary, fontSize: 14, fontWeight: '800' },
  schedule: { color: t.ink, fontSize: 13, fontWeight: '800', marginTop: 4 },
  delay: { color: '#9A6A2C', backgroundColor: '#FFF4DD', borderRadius: 8, padding: 9, fontSize: 11, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 12, borderWidth: 1, borderColor: t.border },
  title: { color: t.ink, fontSize: 17, fontWeight: '800' },
  name: { color: t.ink, fontSize: 13, fontWeight: '700' },
  muted: { color: t.muted, fontSize: 12, lineHeight: 18, flexShrink: 1 },
  value: { color: t.ink, fontSize: 12, fontWeight: '700' },
  total: { color: t.ink, fontSize: 18, fontWeight: '900' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  progressLabel: { flex: 1, color: t.muted, fontSize: 13 },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: t.outline },
  dotDone: { backgroundColor: t.primary },
  item: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  image: { width: 62, height: 68, backgroundColor: t.tint, borderRadius: 10 },
  itemCopy: { flex: 1, gap: 4 }, row: { flexDirection: 'row', justifyContent: 'space-between' },
  primary: { backgroundColor: t.primary, borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  returnAction: { backgroundColor: t.tint, borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  returnCopy: { flex: 1 }, returnTitle: { color: t.primary, fontSize: 12, fontWeight: '800', marginBottom: 3 },
  returnButton: { backgroundColor: t.primary, borderRadius: 10, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center' },
  returnButtonText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  returnNotice: { backgroundColor: t.tint, borderRadius: 10, padding: 12, gap: 5 },
  requestId: { color: t.primary, fontSize: 12, fontWeight: '800' },
  link: { color: t.primary, fontWeight: '800', fontSize: 13 }, error: { color: colors.error, fontSize: 12 },
});
