import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ShopProduct } from '../../../services/api/product-api';
import { colors } from '../../../theme';
import { money } from '../../../utils/money';
import { useAppTheme } from '../../../theme/ThemeProvider';

export function ProductRecommendations({ products, onOpen }: { products: ShopProduct[]; onOpen: (id: string) => void }) {
  const theme = useAppTheme();
  if (!products.length) return null;
  return <View style={[s.section, { backgroundColor: theme.colors.raised }]}>
    <View style={s.headingRow}>
      <View><Text accessibilityRole="header" style={[s.title, { color: theme.colors.text }]}>Similar Products</Text></View>
      <Text style={[s.swipeHint, { color: theme.colors.muted }]}>Swipe to explore</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>
      {products.slice(0, 6).map((product) => {
        const discount = product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;
        return <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}`} key={product.id} onPress={() => onOpen(product.id)} style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[s.imageWrap, { backgroundColor: theme.colors.raised }]}>{product.coverImage ? <Image source={{ uri: product.coverImage }} style={s.image} resizeMode="cover" /> : <Text style={[s.noImage, { color: theme.colors.muted }]}>No photo</Text>}
            {discount > 0 && <Text style={s.badge}>{discount}% off</Text>}
          </View>
          <Text numberOfLines={1} style={[s.brand, { color: theme.colors.primary }]}>{product.brand || product.storeName}</Text>
          <Text numberOfLines={2} style={[s.name, { color: theme.colors.text }]}>{product.name}</Text>
          <View style={s.priceRow}><Text style={[s.price, { color: theme.colors.text }]}>{money(product.price)}</Text>{discount > 0 && <Text style={[s.mrp, { color: theme.colors.muted }]}>{money(product.mrp)}</Text>}</View>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  section: { marginTop: 12, padding: 15, borderRadius: 16, backgroundColor: '#EAE2F5' },
  headingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  eyebrow: { color: '#A07768', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  title: { color: '#282238', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  swipeHint: { color: '#928B98', fontSize: 11, marginBottom: 2 },
  list: { gap: 12, paddingTop: 16, paddingRight: 20 },
  card: { width: 128, borderRadius: 12, padding: 6, borderWidth: 1 },
  imageWrap: { height: 158, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F0F4', borderRadius: 9, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  noImage: { color: colors.mutedText, fontSize: 11 },
  badge: { position: 'absolute', left: 8, top: 8, color: '#FFFFFF', backgroundColor: '#16A56D', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, fontSize: 9, fontWeight: '800' },
  brand: { color: '#8B2CFF', fontSize: 10, fontWeight: '800', marginTop: 9, textTransform: 'uppercase' },
  name: { color: '#332B3C', fontSize: 13, fontWeight: '700', lineHeight: 18, marginTop: 3, minHeight: 36 },
  priceRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 5 },
  price: { color: '#282238', fontSize: 14, fontWeight: '800' },
  mrp: { color: '#9A929E', fontSize: 11, textDecorationLine: 'line-through' },
});