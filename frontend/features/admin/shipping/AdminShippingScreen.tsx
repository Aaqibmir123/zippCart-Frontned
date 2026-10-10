import { AppLoader } from '../../../components/AppLoader';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { AdminTab } from '../stores/AdminDrawer';
import { adminShippingApi } from './admin-shipping-api';
import { DispatchSettings } from './DispatchSettings';
import { ShippingOperations } from './ShippingOperations';
import { InventoryAlerts } from '../../../components/shop/InventoryAlerts';
import { AdminOrderDetails } from './AdminOrderDetails';
import { ss as s } from '../../seller/seller.styles';
import { OrderQueue, queueOptions, useAdminAnalytics } from '../dashboard/dashboard-api';
import { ds } from '../dashboard/dashboard.styles';
import { OrderQueueFilters } from '../../orders/OrderQueueFilters';
import { AdminOrderCard } from './AdminOrderCard';
import { useScreenActive } from '../../../hooks/useScreenActive';

type Props = { onNavigate: (tab: AdminTab) => void; initialQueue?: OrderQueue;
  initialOrderId?: string; onNotificationOpened?: () => void };
export function AdminShippingScreen({ onNavigate, initialQueue = 'all', initialOrderId, onNotificationOpened }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState('All orders');
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (initialOrderId) { setSelected(initialOrderId); onNotificationOpened?.(); }
  }, [initialOrderId, onNotificationOpened]);
  const [queue, setQueue] = useState<OrderQueue>(initialQueue);
  const active = useScreenActive(!selected);
  const analytics = useAdminAnalytics(7, active && tab === 'All orders');
  const selectedQueue = queueOptions.find((item) => item.key === queue);
  const all = tab === 'All orders';
  const query = useInfiniteQuery({ queryKey: ['admin-shipping-all', user?.id, queue], initialPageParam: 1,
    queryFn: ({ pageParam }) => adminShippingApi.all(pageParam, queue), getNextPageParam: (last) => last.nextPage ?? undefined,
    enabled: active && !!user?.roles?.includes('admin') && all, retry: false, refetchInterval: active && all ? 30000 : false });
  const orders = query.data?.pages.flatMap((page) => page.orders) ?? [];
  if (!user?.roles?.includes('admin')) return <View style={s.content}><Text style={s.danger}>Admin access required.</Text></View>;
  return <>
    <ScrollView style={{ backgroundColor: '#F6F2FB' }} contentContainerStyle={ds.content} refreshControl={all ? <RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); void analytics.refetch(); }} /> : undefined}>
      <Text style={ds.title}>Orders & shipping</Text>
      <View style={[s.row, { flexWrap: 'wrap', gap: 12 }]}>{['All orders', 'In transit', 'Attention', 'Stock', 'Settings'].map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={{ paddingVertical: 10 }}><Text style={tab === item ? s.link : s.text}>{item}</Text></Pressable>)}</View>
      {tab === 'Settings' ? <DispatchSettings /> : tab === 'Stock' ? <InventoryAlerts admin /> : !all ? <ShippingOperations enabled={!selected} attention={tab === 'Attention'} onDetails={setSelected} /> : <>
        <OrderQueueFilters selected={queue} counts={analytics.isError ? undefined : analytics.data?.queues} onSelect={setQueue} />
        {analytics.isError && <Pressable onPress={() => void analytics.refetch()}><Text style={ds.error}>Counts unavailable. Tap to retry.</Text></Pressable>}
        <View style={ds.row}>{queueOptions.filter((item) => ['refund_pending', 'refunded'].includes(item.key)).map((item) =>
          <Pressable key={item.key} onPress={() => setQueue(item.key)} style={[ds.card, { backgroundColor: item.bg, borderColor: queue === item.key ? item.color : item.bg }]}>
            <Text style={[ds.link, { color: item.color }]}>{item.label} ({analytics.isError ? '-' : analytics.data?.queues[item.key] ?? '-'})</Text>
          </Pressable>)}</View>
        <View style={ds.between}><Text style={ds.heading}>{selectedQueue?.label ?? (queue === 'active' ? 'Active orders' : queue === 'history' ? 'Order history' : 'All orders')}</Text><Text style={ds.muted}>{query.data ? `${query.data.pages[0].total} orders` : ''}</Text></View>
        {queue === 'preparing' && <Text style={ds.muted}>Seen by seller or partly dispatched; awaiting all parcels.</Text>}
        {['returns', 'exchanges', 'refund_pending', 'refunded'].includes(queue) && <Pressable onPress={() => onNavigate('Returns')} style={ds.card}><Text style={ds.link}>Manage requests in Support →</Text></Pressable>}
        {query.isPending ? <AppLoader /> : query.isError ? <Pressable style={s.card} onPress={() => void query.refetch()}><Text style={s.danger}>Could not load orders. Tap to retry.</Text></Pressable> : orders.map((order, index) =>
          <AdminOrderCard key={order.id} order={order} number={index + 1} onOpen={() => setSelected(order.id)} />)}
        {query.isSuccess && !orders.length && <View style={s.card}><Text style={s.title}>No orders in this queue</Text></View>}
        {query.hasNextPage && <Pressable style={s.button} disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()}><Text style={s.buttonText}>Load more</Text></Pressable>}
      </>}
      <Pressable onPress={() => onNavigate('Overview')}><Text style={s.link}>Back to overview</Text></Pressable>
    </ScrollView>
    {!!selected && <AdminOrderDetails orderId={selected} onClose={() => setSelected(null)} />}
  </>;
}
