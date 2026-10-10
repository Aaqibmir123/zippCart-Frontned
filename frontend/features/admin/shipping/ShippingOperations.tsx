import { AppLoader } from '../../../components/AppLoader';
import { OperationsBadges } from '../../orders/OperationsBadges';
import { operationsTone } from '../../orders/operations-model';
import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, TextInput, View } from 'react-native';
import { adminShippingApi, AttentionOrder } from './admin-shipping-api';
import { ss as s } from '../../seller/seller.styles';
import { useScreenActive } from '../../../hooks/useScreenActive';

export function ShippingOperations({ attention, onDetails, enabled = true }: { attention: boolean; onDetails: (id: string) => void; enabled?: boolean }) {
  const active = useScreenActive(enabled);
  const query = useInfiniteQuery({ queryKey: ['shipping-operations', attention], initialPageParam: 1,
    queryFn: ({ pageParam }) => attention ? adminShippingApi.attention(pageParam) : adminShippingApi.transit(pageParam),
    enabled: active, getNextPageParam: (last) => last.nextPage ?? undefined, refetchInterval: active ? 30000 : false });
  if (query.isPending) return <AppLoader />;
  if (query.isError) return <Pressable onPress={() => void query.refetch()}><Text style={s.danger}>Could not load orders. Retry</Text></Pressable>;
  const orders = query.data.pages.flatMap((page) => page.orders);
  return <View style={{ gap: 12 }}>
    {!orders.length && <Text style={s.small}>No orders in this queue.</Text>}
    {orders.map((order, index) => <View key={order.id} style={[s.card, { backgroundColor: operationsTone(order.operations).bg, borderLeftWidth: 4, borderLeftColor: operationsTone(order.operations).color }]}>
      <Text style={s.title}>{index + 1}. #{order.id.slice(-8).toUpperCase()}</Text><OperationsBadges value={order.operations} />
      <Pressable onPress={() => onDetails(order.id)}><Text style={s.link}>Customer & seller details →</Text></Pressable>
      {attention ? <><Text style={s.danger}>{(order as AttentionOrder).reasons.join(' · ')}</Text><Text style={s.small}>Order retained. Contact the seller and resolve issues; no automatic cancellation.</Text>
        {(order as AttentionOrder).issues.map((issue) => <ResolveIssue key={issue.storeId} orderId={order.id} issue={issue} />)}</> :
        <Text style={s.small}>Awaiting customer receipt confirmation. Delivery status updates when the customer confirms in their order details.</Text>}

    </View>)}
    {query.hasNextPage && <Pressable disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()}><Text style={s.link}>Load more</Text></Pressable>}
  </View>;
}
function ResolveIssue({ orderId, issue }: { orderId: string; issue: { storeId: string; note: string } }) {
  const [note, setNote] = useState('');
  const client = useQueryClient();
  const resolve = useMutation({ mutationFn: () => adminShippingApi.resolve(orderId, issue.storeId, note.trim()),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['shipping-operations'] }), client.invalidateQueries({ queryKey: ['admin-shipping-ready'] })]) });
  return <View style={{ gap: 8 }}><Text style={s.text}>{issue.note}</Text><TextInput accessibilityLabel="Stock issue resolution" placeholder="Resolution agreed with seller" value={note} onChangeText={setNote} maxLength={500} style={{ borderWidth: 1, borderColor: '#DDD', padding: 10, borderRadius: 8 }} />
    <Pressable style={s.button} disabled={note.trim().length < 5 || resolve.isPending} onPress={() => resolve.mutate()}><Text style={s.buttonText}>Resolve issue</Text></Pressable>{resolve.isError && <Text style={s.danger}>{resolve.error.message}</Text>}
  </View>;
}
