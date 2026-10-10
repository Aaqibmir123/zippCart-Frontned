import { AppLoader } from '../../components/AppLoader';
import { FlatList, Pressable, Text, View } from 'react-native';
import { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import { ReturnSummary, statusLabels } from './return-types';
import { supportStyles as s } from './support.styles';
import { rs } from './return.styles';

type InboxPage = { cases: ReturnSummary[]; nextPage: number | null; total: number };
export function SupportInbox({ query, admin = false, history = false, onOpen }: {
  query: UseInfiniteQueryResult<InfiniteData<InboxPage>, Error>;
  admin?: boolean; history?: boolean; onOpen: (item: ReturnSummary) => void;
}) {
  const cases = query.data?.pages.flatMap((page) => page.cases) ?? [];
  if (query.isPending) return <AppLoader accessibilityLabel="Loading support conversations" />;
  if (query.isError && !query.data) return <View style={s.empty}>
    <Text style={rs.error}>Could not load conversations.</Text>
    <Pressable style={rs.secondary} onPress={() => void query.refetch()}><Text style={rs.link}>Try again</Text></Pressable>
  </View>;
  return <FlatList data={cases} keyExtractor={(item) => item.id} contentContainerStyle={s.list}
    refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()}
    ListHeaderComponent={<View style={s.toolbar}>
      <Text style={s.rowTitle}>{history ? 'Past conversations' : 'Active conversations'}</Text>
      <Text style={s.subtitle}>{admin ? 'Open a conversation to reply or manage the request.' : 'Messages, return progress and help — together in one place.'}</Text>
      {query.isError && <Pressable onPress={() => void query.refetch()}><Text style={rs.error}>Could not refresh. Tap to retry.</Text></Pressable>}
    </View>}
    ListEmptyComponent={<View style={s.empty}>
      <View style={s.avatar}><Text style={s.initials}>Z</Text></View>
      <Text style={s.title}>{history ? 'No past conversations' : 'No active requests'}</Text>
      <Text style={s.emptyText}>{admin ? 'Customer return and exchange requests will appear here.'
        : history ? 'Completed and closed requests will appear here.' : 'Need a return or exchange? Open a delivered item in My orders to start. For anything else, use Contact us.'}</Text>
    </View>}
    renderItem={({ item }) => <Pressable accessibilityRole="button"
      accessibilityLabel={(admin ? item.customer : item.itemName || 'Return request') + ', ' + statusLabels[item.status] + (item.unread ? ', unread update' : '')}
      style={[s.row, item.unread && s.unreadRow]} onPress={() => onOpen(item)}>
      <View style={s.avatar}><Text style={s.initials}>{admin ? item.customer?.slice(0, 2).toUpperCase() || 'CU' : 'Z'}</Text></View>
      <View style={s.flex}>
        <View style={s.rowTop}><Text numberOfLines={1} style={s.rowTitle}>{admin ? item.customer : item.itemName || 'Return request'}</Text>
          <Text style={s.meta}>{new Date(item.updatedAt || item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text></View>
        <Text numberOfLines={1} style={s.preview}>{item.lastMessage || 'Your support conversation is ready.'}</Text>
        <View style={[s.rowTop, { marginTop: 8 }]}>
          <Text style={s.status}>{statusLabels[item.status]}</Text>{item.unread && <View style={s.dot} />}
        </View>
        <Text numberOfLines={1} style={[s.meta, { marginTop: 5 }]}>{item.preference === 'refund' ? 'Refund' : 'Exchange'} · {admin ? item.itemName || item.requestId : item.requestId}</Text>
      </View>
    </Pressable>}
    ListFooterComponent={query.hasNextPage ? <Pressable style={[rs.secondary, { margin: 18 }]}
      disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()}>
      <Text style={rs.link}>{query.isFetchingNextPage ? 'Loading…' : query.isFetchNextPageError ? 'Could not load more. Retry' : 'Load more conversations'}</Text>
    </Pressable> : null} />;
}
