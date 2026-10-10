import { AppLoader } from '../../components/AppLoader';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import type { Order } from '../../services/api/order-api';
import { reviewApi } from './review-api';
import { ReviewForm } from './ReviewForm';
import { reviewStyles as s } from './review.styles';
import { useAppTheme } from '../../theme/ThemeProvider';
export function OrderReviews({ order }: { order: Order }) {
  const theme = useAppTheme();
  const { user } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);
  const query = useQuery({ queryKey: ['reviews', 'own', user?.id, order.id], queryFn: () => reviewApi.own(order.id), enabled: order.status === 'delivered' });
  if (order.status !== 'delivered') return null;
  return <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[s.title, { color: theme.colors.text }]}>Rate your products</Text>
    {query.isPending ? <AppLoader color={theme.colors.primary} /> : query.isError ? <Pressable onPress={() => void query.refetch()}><Text style={s.error}>Could not load reviews. Retry</Text></Pressable> : order.items.map((item, index) => {
      const review = query.data.reviews.find((row) => row.itemIndex === index);
      return <View key={index} style={{ gap: 6, paddingVertical: 8 }}><Text style={[s.text, { color: theme.colors.text }]}>{item.name} {[item.color, item.size].filter(Boolean).join(' / ')}</Text>
        {review ? <Text style={s.verified}>Reviewed · {review.rating}/5{review.status === 'hidden' ? ' · Hidden by moderation' : ''}</Text> : <Pressable style={[s.secondary, { backgroundColor: theme.colors.raised }]} onPress={() => setSelected(index)}><Text style={[s.link, { color: theme.colors.primary }]}>Rate Product</Text></Pressable>}</View>;
    })}
    {selected !== null && <ReviewForm orderId={order.id} itemIndex={selected} name={order.items[selected].name} onClose={() => setSelected(null)} />}
  </View>;
}
