import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StoreIcon } from '../user/store-registration/StoreIcon';
import { SellerOrder } from './orders/seller-order-api';
import { money } from '../../utils/money';
import { ss } from './seller.styles';
import { InventoryAlerts } from '../../components/shop/InventoryAlerts';
import { SellerPayoutOverview } from './payouts/SellerPayoutOverview';
import { groupOptions, operationsOptions, OperationsQueue } from '../orders/operations-model';

const date = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const status = (value: SellerOrder['status']) => ({ placed: 'New', preparing: 'Preparing', packed: 'Packed', ready_for_dispatch: 'Ready for dispatch', dispatched: 'Dispatched', out_for_delivery: 'Out for delivery',
  delivered: 'Delivered', return_requested: 'Return requested', return_approved: 'Return approved',
  return_rejected: 'Return declined', return_completed: 'Return completed', cancelled: 'Cancelled' })[value];

export function SellerHome({ queues, recentOrders, productCount, onOrders, onProducts, onEarnings }: {
  queues: Record<OperationsQueue, number>; recentOrders: SellerOrder[]; productCount: number;
  onOrders: (queue: OperationsQueue) => void; onProducts: () => void; onEarnings: () => void;
}) {
  return <ScrollView contentContainerStyle={ss.content}>
    <View><Text style={ss.kicker}>STORE OVERVIEW</Text><Text style={[ss.title, { marginTop: 7 }]}>Store at a glance</Text>
      <Text style={s.intro}>Active includes the 24-hour return window and open returns / exchanges.</Text></View>
    <View style={s.groups}>{groupOptions.map((option) =>
      <Pressable key={option.key} accessibilityRole="button" accessibilityLabel={`${option.label} orders: ${queues[option.key]}`}
        onPress={() => onOrders(option.key)} style={[s.group, { backgroundColor: option.bg }]}>
        <Text style={[s.metricNumber, { color: option.color }]}>{queues[option.key]}</Text>
        <Text style={[s.metricLabel, { color: option.color }]}>{option.label}</Text>
      </Pressable>)}</View>
    <InventoryAlerts />
    <SellerPayoutOverview onDetails={onEarnings} />
    <View style={s.metrics}>{operationsOptions.map((option) =>
      <Pressable key={option.key} accessibilityRole="button" accessibilityLabel={`${option.label} orders: ${queues[option.key]}`}
        onPress={() => onOrders(option.key)} style={[s.metric, { backgroundColor: option.bg }]}>
        <Text style={[s.metricNumber, { color: option.color }]}>{queues[option.key]}</Text>
        <Text style={[s.metricLabel, { color: option.color }]}>{option.label}</Text>
      </Pressable>)}</View>
    <View style={s.sectionHead}><Text style={s.sectionTitle}>Recent orders</Text>
      <Pressable accessibilityRole="button" onPress={() => onOrders('all')}><Text style={s.link}>View all  →</Text></Pressable></View>
    <View style={s.listCard}>{recentOrders.length ? recentOrders.map((order, index) =>
      <Pressable key={order.id} accessibilityRole="button" onPress={() => onOrders('all')}
        style={[s.orderRow, index > 0 && s.orderBorder]}>
        <View style={s.orderIcon}><Text style={s.link}>{index + 1}</Text></View>
        <View style={s.flex}><Text style={s.orderName}>#{order.id.slice(-8).toUpperCase()} · {order.customer}</Text>
          <Text style={s.orderSub}>{date(order.createdAt)} · {status(order.status)}</Text></View>
        <Text style={s.orderPrice}>{money(order.subtotal)}</Text></Pressable>)
      : <Text style={s.empty}>Customer orders will appear here after a purchase.</Text>}</View>
    <Pressable accessibilityRole="button" onPress={onProducts} style={s.catalogue}>
      <View style={s.catalogueIcon}><StoreIcon name="store" color="#39775D" size={22} /></View>
      <View style={s.flex}><Text style={s.catalogueTitle}>Your catalogue</Text>
        <Text style={s.catalogueSub}>{productCount} {productCount === 1 ? 'product' : 'products'} listed</Text></View>
      <Text style={s.link}>Manage  →</Text></Pressable>
  </ScrollView>;
}

const s = StyleSheet.create({
  intro: { color: '#81798E', fontSize: 12, marginTop: 6 },
  groups: { flexDirection: 'row', gap: 10 }, group: { flex: 1, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#ECE8F2' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, flexBasis: '45%', borderRadius: 16, padding: 16, minHeight: 90, borderWidth: 1, borderColor: '#ECE8F2' },
  metricNumber: { color: '#302742', fontSize: 25, fontWeight: '900' }, metricLabel: { color: '#625A70', fontSize: 12, fontWeight: '800', marginTop: 3 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  sectionTitle: { color: '#302742', fontSize: 17, fontWeight: '800' }, link: { color: '#6838F5', fontSize: 12, fontWeight: '800' },
  listCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ECE8F2', borderRadius: 18, paddingHorizontal: 16 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 14 }, orderBorder: { borderTopWidth: 1, borderTopColor: '#F0EDF4' },
  orderIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F0EAFE', alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 }, orderName: { color: '#302742', fontSize: 12, fontWeight: '800' }, orderSub: { color: '#81798E', fontSize: 10, marginTop: 4 },
  orderPrice: { color: '#6838F5', fontSize: 12, fontWeight: '800' }, empty: { color: '#81798E', fontSize: 12, paddingVertical: 18 },
  catalogue: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1,
    borderColor: '#ECE8F2', padding: 16 }, catalogueIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#F0EAFE', alignItems: 'center', justifyContent: 'center' },
  catalogueTitle: { color: '#302742', fontSize: 14, fontWeight: '800' }, catalogueSub: { color: '#81798E', fontSize: 11, marginTop: 4 },
});
