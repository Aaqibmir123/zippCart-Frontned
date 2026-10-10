import { AppLoader } from '../../components/AppLoader';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { reviewApi } from './review-api';
import type { Review } from './review-types';
import { ReviewCard } from './ReviewCard';
import { reviewStyles as s } from './review.styles';

export function ReviewWorkspace({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const [status, setStatus] = useState('all');
  const [rating, setRating] = useState('');
  const [product, setProduct] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const allowed = !!user?.roles?.includes(admin ? 'admin' : 'seller');
  const query = useInfiniteQuery({ queryKey: ['reviews', 'workspace', user?.id, admin, status, rating, filterProduct], enabled: allowed, initialPageParam: 1,
    queryFn: ({ pageParam }) => reviewApi.workspace(admin, pageParam, status, rating, filterProduct), getNextPageParam: (last) => last.nextPage ?? undefined });
  if (!allowed) return <Text style={s.error}>Access denied.</Text>;
  return <ScrollView contentContainerStyle={s.content}><Text style={s.title}>{admin ? 'Review moderation' : 'Customer reviews'}</Text>
    <Text style={s.muted}>{admin ? 'Every moderation action requires a reason and is recorded.' : 'Reply to reviews for your own products. Customer reviews cannot be edited or deleted here.'}</Text>
    {admin && <View style={s.row}>{['all', 'published', 'reported', 'hidden'].map((value) => <Pressable key={value} style={s.secondary} onPress={() => setStatus(value)}><Text style={status === value ? s.link : s.muted}>{value}</Text></Pressable>)}</View>}
    <View style={s.row}>{['', '5', '4', '3', '2', '1'].map((value) => <Pressable key={value} onPress={() => setRating(value)} style={s.secondary}><Text style={rating === value ? s.link : s.muted}>{value ? `${value} ★` : 'All ratings'}</Text></Pressable>)}</View>
    <View style={s.row}><TextInput accessibilityLabel="Filter by product ID" placeholder="Product ID (optional)" value={product} onChangeText={setProduct} style={[s.input, { flex: 1 }]} autoCapitalize="none" /><Pressable disabled={!!product.trim() && !/^[a-f\d]{24}$/i.test(product.trim())} onPress={() => setFilterProduct(product.trim())}><Text style={s.link}>Filter</Text></Pressable></View>
    {query.isPending ? <AppLoader /> : query.isError ? <Pressable onPress={() => void query.refetch()}><Text style={s.error}>Could not load reviews. Tap to retry.</Text></Pressable> : <>
      {!query.data.pages[0].count && <Text style={s.text}>No reviews match these filters.</Text>}
      {query.data.pages.flatMap((page) => page.reviews).map((review) => <View key={review.id} style={{ gap: 8 }}><Text style={s.title}>{review.productName}</Text><Text selectable style={s.muted}>Product: {review.productId}</Text>{review.reported && <Text style={s.error}>Flagged for review</Text>}<ReviewCard review={review} /><ReviewActions key={`${review.id}:${review.version}`} review={review} admin={admin} /></View>)}
      {query.hasNextPage && <Pressable disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} style={s.secondary}><Text style={s.link}>Load more</Text></Pressable>}
    </>}
  </ScrollView>;
}
function ReviewActions({ review, admin }: { review: Review; admin: boolean }) {
  const client = useQueryClient();
  const [text, setText] = useState(admin ? '' : review.sellerReply?.comment ?? '');
  const [showAudit, setShowAudit] = useState(false);
  const audit = useQuery({ queryKey: ['reviews', 'audit', review.id], queryFn: () => reviewApi.audit(review.id), enabled: admin && showAudit });
  const mutation = useMutation({ mutationFn: (action: string) => admin ? reviewApi.moderate(review.id, action, text.trim(), review.version) : reviewApi.reply(review.id, text.trim(), review.version),
    onSuccess: () => client.invalidateQueries({ queryKey: ['reviews'] }),
    onError: () => { void client.invalidateQueries({ queryKey: ['reviews', 'workspace'] }); } });
  return <View style={s.card}>
    {(admin || review.status === 'published') && <>
      <TextInput accessibilityLabel={admin ? 'Moderation reason' : 'Seller reply'} placeholder={admin ? 'Required moderation reason' : 'Write a helpful reply'} multiline value={text} onChangeText={setText} maxLength={admin ? 500 : 1000} editable={!mutation.isPending} style={s.input} />
      <View style={s.row}>{(admin ? ['report', review.status === 'hidden' ? 'restore' : 'hide'] : ['reply']).map((action) => <Pressable key={action} disabled={mutation.isPending || text.trim().length < (admin ? 5 : 2)} style={[s.secondary, (mutation.isPending || text.trim().length < (admin ? 5 : 2)) && s.disabled]} onPress={() => mutation.mutate(action)}><Text style={s.link}>{action === 'reply' ? 'Save reply' : action === 'report' ? 'Flag review' : action === 'hide' ? 'Hide review' : 'Restore review'}</Text></Pressable>)}</View>
    </>}
    {mutation.isError && <Text style={s.error}>{mutation.error.message}</Text>}
    {admin && <Pressable onPress={() => setShowAudit(!showAudit)}><Text style={s.link}>{showAudit ? 'Close audit history' : 'View audit history'}</Text></Pressable>}
    {showAudit && (audit.isPending ? <AppLoader /> : audit.isError ? <Pressable onPress={() => void audit.refetch()}><Text style={s.error}>Could not load audit history. Retry</Text></Pressable> : audit.data.events.map((event) => <View key={event._id} style={s.reply}><Text style={s.text}>{event.action} · {new Date(event.createdAt).toLocaleString('en-IN')}</Text><Text style={s.muted}>{event.reason}</Text>{event.before && event.after && <Text style={s.muted}>{event.before.status} → {event.after.status}</Text>}</View>))}
  </View>;
}
