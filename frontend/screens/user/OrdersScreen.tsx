import { AppLoader } from '../../components/AppLoader';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrders } from '../../services/orders/order-queries';
import { Order } from '../../services/api/order-api';
import { ShopStackParamList } from '../../navigation/user/shop-routes';
import { OrderHistoryCard } from '../../components/shop/orders/OrderHistoryCard';
import { ReorderSheet } from '../../components/shop/orders/ReorderSheet';
import { s } from '../../features/orders/orders.styles';
import { useAppTheme } from '../../theme/ThemeProvider';

export function OrdersScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  const [reorderOrder, setReorderOrder] = useState<Order | null>(null);
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const query = useOrders(tab);
  const orders = useMemo(() => {
    const seen = new Set<string>();
    return (query.data?.pages ?? []).flatMap((page) => page.orders).filter((order) => {
      if (seen.has(order.id)) return false;
      seen.add(order.id); return true;
    });
  }, [query.data]);
  const renderOrder = useCallback(({ item }: { item: Order }) => <OrderHistoryCard order={item}
    onOpen={() => navigation.navigate('OrderDetails', { orderId: item.id })}
    onReorder={() => setReorderOrder(item)} />, [navigation]);
  function loadMore(retry = false) {
    if (query.hasNextPage && !query.isFetching && (retry || !query.isFetchNextPageError)) {
      void query.fetchNextPage({ cancelRefetch: false });
    }
  }
  return <SafeAreaView edges={['top']} style={[s.page, { backgroundColor: theme.colors.background }]}>
    <View style={[s.header, { backgroundColor: theme.colors.surface }]}>
      <Text style={[s.title, { color: theme.colors.text }]}>Orders</Text>
      <View accessibilityRole="tablist" style={[s.tabs, theme.isDark && { backgroundColor: theme.colors.raised }]}>
        {(['active', 'past'] as const).map((value) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }}
          onPress={() => setTab(value)} style={({ pressed }) => [s.tab, tab === value && { backgroundColor: theme.colors.primary }, pressed && s.pressed]}>
          <Text style={[s.tabText, { color: tab === value ? '#FFFFFF' : theme.colors.muted }]}>{value === 'active' ? 'Active' : 'History'}</Text>
        </Pressable>)}
      </View>
    </View>
    {query.isPending ? <View style={s.center}><AppLoader variant="section" accessibilityLabel="Loading orders" color={theme.colors.primary} /></View>
      : query.isError && !query.data ? <View style={s.center}><Text style={[s.empty, { color: theme.colors.text }]}>Could not load orders</Text>
        <Pressable accessibilityRole="button" disabled={query.isFetching} onPress={() => void query.refetch()} style={[s.retry, { borderColor: theme.colors.primary }]}><Text style={[s.buttonText, { color: theme.colors.primary }]}>Retry</Text></Pressable></View>
      : <FlatList key={tab} data={orders} keyExtractor={(order) => order.id} contentContainerStyle={[s.list, { backgroundColor: theme.colors.background }]}
        initialNumToRender={6} maxToRenderPerBatch={6} windowSize={7}
        showsVerticalScrollIndicator={false} refreshing={query.isRefetching} onRefresh={() => { if (!query.isFetching) void query.refetch(); }}
        onEndReached={() => loadMore()} onEndReachedThreshold={0.4}
        ListHeaderComponent={query.isRefetchError ? <Pressable accessibilityRole="button" disabled={query.isFetching} onPress={() => void query.refetch()} style={[s.note, theme.isDark && { backgroundColor: theme.colors.raised }]}><Text style={[s.noteText, { color: theme.colors.primary }]}>Could not refresh. Tap to retry.</Text></Pressable> : null}
        ListFooterComponent={query.isFetchingNextPage ? <AppLoader accessibilityLabel="Loading more orders" color={theme.colors.primary} />
          : query.hasNextPage ? <Pressable accessibilityRole="button" disabled={query.isFetching} onPress={() => loadMore(true)} style={[s.retry, { borderColor: theme.colors.primary }]}>
            <Text style={[s.buttonText, { color: theme.colors.primary }]}>{query.isFetchNextPageError ? 'Could not load more orders. Tap to retry.' : 'Load more orders'}</Text>
          </Pressable> : null}
        ListEmptyComponent={<View style={s.center}><Text style={[s.empty, { color: theme.colors.text }]}>{tab === 'active' ? 'No active orders' : 'No order history yet'}</Text>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ShopTabs', { screen: 'Home', params: { view: 'home' } })} style={[s.retry, { borderColor: theme.colors.primary }]}><Text style={[s.buttonText, { color: theme.colors.primary }]}>Shop now</Text></Pressable></View>}
        renderItem={renderOrder} />}
    {reorderOrder && <ReorderSheet order={reorderOrder} onClose={() => setReorderOrder(null)} onAdded={() => { setReorderOrder(null); navigation.navigate('ShopTabs', { screen: 'Cart' }); }} />}
  </SafeAreaView>;
}
