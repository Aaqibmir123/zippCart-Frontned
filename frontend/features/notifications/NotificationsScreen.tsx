import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ShopStackParamList } from '../../navigation/user/shop-routes';
import { AppLoader } from '../../components/AppLoader';
import { useNotificationInbox } from './notification-inbox';
import { useAppTheme } from '../../theme/ThemeProvider';

export function NotificationsScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  const query = useNotificationInbox();
  const updates = query.data?.pages.flatMap((page) => page.notifications) ?? [];
  const items = [...new Map(updates.map((item) => [item.id, item])).values()];
  return <SafeAreaView style={[s.page, { backgroundColor: theme.colors.background }]}>
    <View style={[s.header, { backgroundColor: theme.colors.surface }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={s.back}>
        <Text style={[s.arrow, { color: theme.colors.text }]}>‹</Text>
      </Pressable>
      <Text accessibilityRole="header" style={[s.title, { color: theme.colors.text }]}>Notifications</Text>
    </View>
    <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={[s.content, { backgroundColor: theme.colors.background }]}
      refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()}
      ListHeaderComponent={query.isError && items.length > 0 ? <Pressable onPress={() => void query.refetch()} style={s.state}>
        <Text style={[s.caption, { color: theme.colors.muted }]}>Could not refresh updates. Tap to retry.</Text>
      </Pressable> : null}
      renderItem={({ item }) => <Pressable accessibilityRole="button" style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => navigation.navigate('OrderDetails', { orderId: item.orderId })}>
        <Text style={[s.heading, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[s.body, { color: theme.colors.muted }]}>{item.body}</Text>
        <Text style={[s.caption, { color: theme.colors.muted }]}>{new Date(item.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</Text>
      </Pressable>}
      ListEmptyComponent={<View style={s.state}>
        {query.isPending ? <AppLoader accessibilityLabel="Loading notifications" /> : query.isError ? <>
          <Text style={[s.heading, { color: theme.colors.text }]}>Could not load notifications</Text>
          <Text style={[s.body, { color: theme.colors.muted }]}>Your order updates are temporarily unavailable.</Text>
          <Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={s.retry}><Text style={[s.link, { color: theme.colors.primary }]}>Try again</Text></Pressable>
        </> : <><Text style={[s.heading, { color: theme.colors.text }]}>You're all caught up</Text><Text style={[s.body, { color: theme.colors.muted }]}>Your order updates will appear here.</Text></>}
      </View>}
      ListFooterComponent={query.hasNextPage ? <Pressable accessibilityRole="button" style={s.retry}
        disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()}>
        {query.isFetchingNextPage ? <AppLoader color={theme.colors.primary} /> : <Text style={[s.link, { color: theme.colors.primary }]}>{query.isFetchNextPageError ? 'Try loading more again' : 'Load more'}</Text>}
      </Pressable> : null} />
  </SafeAreaView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAF7FE' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 36, color: '#39234D' },
  title: { fontSize: 24, fontWeight: '800', color: '#39234D' },
  content: { padding: 16, gap: 12, flexGrow: 1 },
  card: { padding: 18, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE5F6', gap: 8 },
  heading: { color: '#39234D', fontSize: 16, fontWeight: '700' },
  body: { color: '#706279', fontSize: 14, lineHeight: 21 },
  caption: { color: '#887891', fontSize: 12, lineHeight: 18 },
  state: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  retry: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  link: { color: '#7139F5', fontWeight: '700' },
});
