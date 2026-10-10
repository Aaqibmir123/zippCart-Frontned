import { AppLoader } from '../../AppLoader';
﻿import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { reviewApi } from '../../../features/reviews/review-api';
import { ReviewCard } from '../../../features/reviews/ReviewCard';
import { reviewStyles as s } from '../../../features/reviews/review.styles';
import { useAppTheme } from '../../../theme/ThemeProvider';

export function ProductReviews({ productId }: { productId: string }) {
  const theme = useAppTheme();
  const { user } = useAuth();
  const client = useQueryClient();
  const [sort, setSort] = useState('latest');
  const query = useInfiniteQuery({ queryKey: ['reviews', 'product', productId, sort], initialPageParam: 1,
    queryFn: ({ pageParam }) => reviewApi.product(productId, pageParam, sort), getNextPageParam: (last) => last.nextPage ?? undefined });
  const helpful = useMutation({ mutationFn: reviewApi.helpful, onSuccess: () => client.invalidateQueries({ queryKey: ['reviews', 'product', productId] }) });
  const stats = query.data?.pages[0].stats;
  const reviews = query.data?.pages.flatMap((page) => page.reviews) ?? [];
  const photos = reviews.flatMap((review) => review.images).slice(0, 12);
  return <View style={[s.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    <Text accessibilityRole="header" style={[s.title, { color: theme.colors.text }]}>Ratings & Reviews</Text>
    {query.isPending ? <AppLoader color={theme.colors.primary} /> : query.isError ? <Pressable onPress={() => void query.refetch()}><Text style={s.error}>Could not load reviews. Tap to retry.</Text></Pressable> : <>
      <View style={s.row}><View style={{ minWidth: 82 }}><Text style={[s.title, { fontSize: 34, color: theme.colors.text }]}>{stats?.count ? stats.average.toFixed(1) : '—'}</Text><Text style={[s.muted, { color: theme.colors.muted }]}>{stats?.count ?? 0} reviews</Text></View>
        <View style={{ flex: 1, gap: 5 }}>{[5, 4, 3, 2, 1].map((star) => <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={[s.muted, { color: theme.colors.muted }]}>{star} ★</Text><View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.colors.raised }}><View style={{ width: `${stats?.count ? (stats.breakdown[star] ?? 0) / stats.count * 100 : 0}%`, height: 6, backgroundColor: '#16A56D', borderRadius: 3 }} /></View><Text style={[s.muted, { color: theme.colors.muted }]}>{stats?.breakdown[star] ?? 0}</Text></View>)}</View>
      </View>
      {!!photos.length && <><Text style={[s.title, { color: theme.colors.text }]}>Customer photos</Text><View style={s.row}>{photos.map((photo, index) => <Image key={index} source={{ uri: photo }} style={s.photo} />)}</View></>}
      <View style={s.row}>{['latest', 'helpful'].map((value) => <Pressable key={value} style={[s.secondary, { backgroundColor: theme.colors.raised }]} accessibilityState={{ selected: sort === value }} onPress={() => setSort(value)}><Text style={sort === value ? [s.link, { color: theme.colors.primary }] : [s.muted, { color: theme.colors.muted }]}>{value === 'latest' ? 'Latest' : 'Most helpful'}</Text></Pressable>)}</View>
      {!reviews.length && <Text style={[s.text, { color: theme.colors.muted }]}>No reviews yet. After delivery, rate this product from your order details.</Text>}
      {reviews.map((review) => <View key={review.id} style={{ gap: 6 }}><ReviewCard review={review} />      {user && <Pressable disabled={helpful.isPending} onPress={() => helpful.mutate(review.id)}><Text style={[s.link, { color: theme.colors.primary }]}>Helpful</Text></Pressable>}</View>)}
      {helpful.isError && <Text style={s.error}>{helpful.error.message}</Text>}
      {query.hasNextPage && <Pressable disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()}><Text style={[s.link, { color: theme.colors.primary }]}>{query.isFetchingNextPage ? 'Loading…' : 'Load more reviews'}</Text></Pressable>}
    </>}
  </View>;
}
