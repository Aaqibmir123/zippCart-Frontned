import { AppLoader } from '../../../components/AppLoader';
import { useState } from 'react';
import { useAdminConfirmation } from '../components/useAdminConfirmation';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { money } from '../../../utils/money';
import { AdminReturn, adminReturnApi, ReturnFilter, ReviewInput } from './admin-return-api';
import { rs } from './admin-return.styles';

const dateTime = (value: string) => new Date(value).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});
const statusLabel: Record<AdminReturn['status'], string> = {
  return_requested: 'Needs review', return_approved: 'Approved',
  return_rejected: 'Rejected', return_completed: 'Completed',
};
const reasonLabel: Record<string, string> = { damaged: 'Damaged or defective', wrong_item: 'Wrong item received',
  not_as_described: 'Not as described', size_fit: 'Size or fit issue', other: 'Other reason' };

function Activity({ label, at }: { label: string; at: string | null }) {
  return <View style={rs.activity}><View style={[rs.activityDot, !at && rs.activityPending]} />
    <Text style={rs.activityLabel}>{label}</Text><Text style={rs.activityTime}>{at ? dateTime(at) : 'Pending'}</Text></View>;
}

export function AdminReturnsScreen() {
  const { user } = useAuth();
  const client = useQueryClient();
  const confirmation = useAdminConfirmation();
  const [filter, setFilter] = useState<ReturnFilter>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [legacyPreference, setLegacyPreference] = useState<'refund' | 'exchange' | null>(null);
  const query = useInfiniteQuery({ queryKey: ['admin-returns', user?.id, filter], initialPageParam: 1,
    queryFn: ({ pageParam }) => adminReturnApi.list(filter, pageParam),
    getNextPageParam: (last) => last.nextPage ?? undefined, retry: false });
  const detail = useQuery({ queryKey: ['admin-return', selectedId], queryFn: () => adminReturnApi.detail(selectedId!),
    enabled: !!selectedId, retry: false });
  const review = useMutation({ mutationFn: ({ id, input }: { id: string; input: ReviewInput }) => adminReturnApi.review(id, input),
    onSuccess: async () => { void client.invalidateQueries({ queryKey: ['admin-analytics'] }); await client.invalidateQueries({ queryKey: ['admin-returns', user?.id] });
      await client.invalidateQueries({ queryKey: ['admin-return', selectedId] }); } });
  const orders = query.data?.pages.flatMap((page) => page.returns) ?? [];
  const order = detail.data?.order;
  function submit(input: ReviewInput, label: string) {
    if (!order || review.isPending) return;
    confirmation.confirm({ title: `Confirm ${label.toLowerCase()}`, label,
      message: input.action === 'complete' ? 'Confirm only after the refund or exchange was actually completed.' : `This will ${label.toLowerCase()} the customer request.`,
      destructive: input.action === 'reject',
      onConfirm: () => review.mutateAsync({ id: order.id, input }),
    });
  }
  if (selectedId) return <ScrollView contentContainerStyle={rs.content}>
    {confirmation.dialog}
    <Pressable accessibilityRole="button" onPress={() => { setSelectedId(null); setNote(''); setReference(''); setLegacyPreference(null); }}>
      <Text style={rs.link}>← Return requests</Text></Pressable>
    {detail.isPending ? <AppLoader /> : detail.isError || !order ? <View style={rs.card}>
      <Text style={rs.error}>Could not load return details.</Text>
      <Pressable onPress={() => void detail.refetch()}><Text style={rs.link}>Try again</Text></Pressable></View> : <>
      <View style={rs.hero}><Text style={rs.kicker}>ORDER #{order.id.slice(-8).toUpperCase()}</Text>
        <Text style={rs.title}>{order.customer}</Text><Text style={rs.heroStatus}>{statusLabel[order.status]}</Text>
        <Text selectable style={rs.requestId}>Request ID: {order.returnRequestId}</Text>
        <Text style={rs.muted}>Requested {dateTime(order.returnRequestedAt)}</Text></View>
      <View style={rs.card}><Text style={rs.heading}>Order activity</Text>
        <Activity label="Order placed" at={order.createdAt} />
        {order.shipments.map((shipment, index) => <Activity key={index}
          label={`${shipment.storeName ?? `Shipment ${index + 1}`} ${shipment.dispatchedAt ? 'dispatched' : 'awaiting dispatch'}`}
          at={shipment.dispatchedAt} />)}
        <Activity label="Customer confirmed receipt" at={order.receivedAt} />
        <Activity label="Return request submitted" at={order.returnRequestedAt} />
        {order.status === 'return_requested' && <Activity label="Awaiting admin review" at={null} />}
        {!!order.returnReviewedAt && <Activity label={order.status === 'return_rejected' ? 'Request rejected' : 'Request approved'}
          at={order.returnReviewedAt} />}
        {order.status === 'return_approved' && <Activity label={order.returnPreference === 'exchange' ? 'Awaiting exchange' : 'Awaiting refund'} at={null} />}
        {!!order.returnCompletedAt && <Activity label={order.returnPreference === 'exchange' ? 'Exchange completed' : 'Refund completed'}
          at={order.returnCompletedAt} />}
      </View>
      <View style={rs.card}><Text style={rs.heading}>Customer request</Text>
        <Text style={rs.label}>PREFERRED OUTCOME</Text><Text style={rs.value}>{order.returnPreference === 'refund' ? 'Return for refund'
          : order.returnPreference === 'exchange' ? 'Exchange' : 'Not specified (older request)'}</Text>
        <Text style={rs.label}>REASON</Text><Text style={rs.value}>{reasonLabel[order.returnReason ?? ''] ?? order.returnReason ?? 'Not provided'}</Text>
        {!!order.returnDescription && <><Text style={rs.label}>DETAILS</Text><Text style={rs.value}>{order.returnDescription}</Text></>}</View>
      <View style={rs.card}><Text style={rs.heading}>Order items</Text>{order.items.map((item, index) =>
        <View key={`${item.productId}-${index}`} style={rs.item}>
          {item.coverImage ? <Image source={{ uri: item.coverImage }} style={rs.image} /> : <View style={rs.image} />}
          <View style={rs.flex}><Text style={rs.value}>{item.name}</Text>
            <Text style={rs.muted}>{[item.storeName, item.color, item.size, `Qty ${item.quantity}`].filter(Boolean).join(' · ')}</Text></View>
          <Text style={rs.value}>{money(item.price * item.quantity)}</Text></View>)}
        <View style={rs.between}><Text style={rs.value}>Order total</Text><Text style={rs.total}>{money(order.total)}</Text></View></View>
      <View style={rs.card}><Text style={rs.heading}>Customer & payment</Text><Text style={rs.value}>{order.shippingAddress.name}</Text>
        <Text style={rs.muted}>{[order.shippingAddress.line1, order.shippingAddress.locality, order.shippingAddress.landmark,
          order.shippingAddress.district,
          order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.pincode].filter(Boolean).join(', ')}</Text>
        <Text selectable style={rs.value}>Phone: {order.shippingAddress.phone}</Text>
        <Text style={rs.muted}>Cash on delivery · {order.paymentStatus === 'paid' ? 'Marked paid' : 'Payment not verified'}</Text></View>
      {!!order.returnReviewedAt && <View style={rs.card}><Text style={rs.heading}>Review history</Text>
        <Text style={rs.muted}>Reviewed {dateTime(order.returnReviewedAt)}</Text>
        {!!order.returnReviewNote && <Text style={rs.value}>{order.returnReviewNote}</Text>}
        {!!order.returnCompletedAt && <Text style={rs.muted}>Completed {dateTime(order.returnCompletedAt)}</Text>}
        {!!order.returnReference && <Text selectable style={rs.value}>Reference: {order.returnReference}</Text>}</View>}
      {order.status === 'return_requested' && <View style={rs.card}><Text style={rs.heading}>Review request</Text>
        {!order.returnPreference && <><Text style={rs.muted}>This older request has no preferred outcome. Choose one before approval.</Text>
          <View style={rs.between}>{(['refund', 'exchange'] as const).map((choice) => <Pressable key={choice}
            accessibilityRole="button" onPress={() => setLegacyPreference(choice)} style={[rs.choice, legacyPreference === choice && rs.choiceActive]}>
            <Text style={rs.link}>{choice === 'refund' ? 'Refund' : 'Exchange'}</Text></Pressable>)}</View></>}
        <TextInput accessibilityLabel="Review note" value={note} onChangeText={setNote} multiline maxLength={500}
          placeholder="Note to customer (required for rejection)" style={rs.input} />
        <View style={rs.between}><Pressable accessibilityRole="button" disabled={review.isPending || (!order.returnPreference && !legacyPreference)}
          onPress={() => submit({ action: 'approve', note: note.trim(),
            preference: order.returnPreference ? undefined : legacyPreference! }, 'Approve')}
          style={[rs.button, rs.flex, (!order.returnPreference && !legacyPreference) && rs.disabled]}>
          <Text style={rs.buttonText}>Approve</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={review.isPending || note.trim().length < 10}
            onPress={() => submit({ action: 'reject', note: note.trim() }, 'Reject')}
            style={[rs.button, rs.rejectButton, rs.flex, note.trim().length < 10 && rs.disabled]}>
            <Text style={rs.buttonText}>Reject</Text></Pressable></View></View>}
      {order.status === 'return_approved' && <View style={rs.card}><Text style={rs.heading}>Complete the case</Text>
        <Text style={rs.muted}>After arranging the {order.returnPreference === 'exchange' ? 'exchange' : 'refund'} outside this app,
          enter its real transaction or fulfilment reference.</Text>
        <TextInput accessibilityLabel="Completion reference" value={reference} onChangeText={setReference}
          maxLength={100} placeholder="Transaction or exchange reference" style={rs.input} />
        <Pressable accessibilityRole="button" disabled={review.isPending || reference.trim().length < 6}
          onPress={() => submit({ action: 'complete', note: '', reference: reference.trim() }, 'Mark completed')}
          style={[rs.button, reference.trim().length < 6 && rs.disabled]}><Text style={rs.buttonText}>Mark completed</Text></Pressable></View>}
      {!!review.error && <Text accessibilityRole="alert" style={rs.error}>{review.error.message}</Text>}
    </>}
  </ScrollView>;
  return <ScrollView contentContainerStyle={rs.content}>
    <View><Text style={rs.kicker}>CUSTOMER CARE</Text><Text style={rs.pageTitle}>Return requests</Text>
      <Text style={rs.muted}>Review refund and exchange requests from real orders.</Text></View>
    <View style={rs.filters}>{(['open', 'closed', 'all'] as const).map((item) => <Pressable key={item}
      accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)}
      style={[rs.filter, filter === item && rs.filterActive]}><Text style={[rs.filterText, filter === item && rs.filterTextActive]}>
        {item === 'open' ? 'Open' : item === 'closed' ? 'Closed' : 'All'}</Text></Pressable>)}</View>
    {query.isPending ? <AppLoader /> : query.isError ? <View style={rs.card}><Text style={rs.error}>Could not load requests.</Text>
      <Pressable onPress={() => void query.refetch()}><Text style={rs.link}>Try again</Text></Pressable></View> : <>
      <View style={rs.between}><Text style={rs.muted}>{query.data.pages[0]?.total ?? 0} requests</Text>
        <Pressable accessibilityRole="button" onPress={() => void query.refetch()}><Text style={rs.link}>Refresh</Text></Pressable></View>
      {orders.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => setSelectedId(item.id)} style={rs.preview}>
        <View style={rs.between}><Text style={rs.kicker}>#{item.id.slice(-8).toUpperCase()}</Text><Text style={rs.status}>{statusLabel[item.status]}</Text></View>
        <Text style={rs.requestId}>{item.returnRequestId}</Text>
        <Text style={rs.heading}>{item.customer}</Text><Text style={rs.muted}>{item.returnPreference === 'exchange' ? 'Exchange' : item.returnPreference === 'refund' ? 'Refund' : 'Outcome needed'}
          {' · '}{reasonLabel[item.returnReason ?? ''] ?? item.returnReason ?? 'Reason not provided'}</Text>
        <View style={rs.between}><Text style={rs.muted}>{dateTime(item.returnRequestedAt)} · {money(item.total)}</Text>
          <Text style={rs.link}>Review →</Text></View></Pressable>)}
      {!orders.length && <View style={rs.card}><Text style={rs.heading}>No requests here</Text>
        <Text style={rs.muted}>Customer return requests will appear when submitted.</Text></View>}
      {query.hasNextPage && <Pressable accessibilityRole="button" disabled={query.isFetchingNextPage}
        onPress={() => void query.fetchNextPage()} style={rs.button}>
        {query.isFetchingNextPage ? <AppLoader color="#fff" /> : <Text style={rs.buttonText}>Load more</Text>}</Pressable>}
    </>}
  </ScrollView>;
}
