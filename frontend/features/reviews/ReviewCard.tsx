import { useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Review } from './review-types';
import { reviewStyles as s } from './review.styles';
import { useAppTheme } from '../../theme/ThemeProvider';
export function ReviewCard({ review }: { review: Review }) {
  const theme = useAppTheme();
  const [photo, setPhoto] = useState<string | null>(null);
  return <View style={[s.card, { backgroundColor: theme.colors.raised, borderColor: theme.colors.border }]}>
    <View style={s.between}><Text style={[s.title, { color: theme.colors.text }]}>{review.authorName}</Text><Text style={[s.muted, { color: theme.colors.muted }]}>{new Date(review.createdAt).toLocaleDateString('en-IN')}</Text></View>
    <View style={s.row}><Text accessibilityLabel={`${review.rating} out of 5 stars`} style={s.stars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>{review.verifiedPurchase && <Text style={s.verified}>✓ Verified purchase</Text>}</View>
    {!!review.title && <Text style={[s.title, { color: theme.colors.text }]}>{review.title}</Text>}<Text style={[s.text, { color: theme.colors.text }]}>{review.comment}</Text>
    {!!review.images.length && <View style={s.row}>{review.images.map((image, index) => <Pressable key={index} accessibilityLabel="View customer photo" onPress={() => setPhoto(image)}><Image source={{ uri: image }} style={s.photo} /></Pressable>)}</View>}
    {review.sellerReply && <View style={[s.reply, { backgroundColor: theme.colors.surface }]}><Text style={[s.link, { color: theme.colors.primary }]}>Seller response</Text><Text style={[s.text, { color: theme.colors.text }]}>{review.sellerReply.comment}</Text></View>}
    <Text style={[s.muted, { color: theme.colors.muted }]}>{review.helpfulCount} found this helpful{review.status === 'hidden' ? ' · Hidden by moderation' : ''}</Text>
    <Modal visible={!!photo} onRequestClose={() => setPhoto(null)}><SafeAreaView style={[s.page, { backgroundColor: theme.colors.background }]}><Pressable style={[s.secondary, { backgroundColor: theme.colors.raised }]} onPress={() => setPhoto(null)}><Text style={[s.link, { color: theme.colors.primary }]}>Close photo</Text></Pressable>{photo && <Image source={{ uri: photo }} style={{ flex: 1 }} resizeMode="contain" />}</SafeAreaView></Modal>
  </View>;
}
