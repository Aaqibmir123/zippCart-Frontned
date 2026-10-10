import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ShopProduct } from '../services/api/product-api';
import { colors } from '../theme';
import { money } from '../utils/money';

type Props = {
  product: ShopProduct; onPress: () => void;
  isFavorite?: boolean; isFavoritePending?: boolean; onToggleFavorite?: () => void;
};

export function ProductCard({ product, onPress, isFavorite, isFavoritePending, onToggleFavorite }: Props) {
  const discount = product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;
  return <View style={s.card}>
    <Pressable accessibilityRole="button" onPress={onPress} style={s.main}>
      <View style={s.visual}>
        {product.coverImage ? <Image source={{ uri: product.coverImage }} style={s.image} resizeMode="cover" /> : <Text style={s.placeholder}>No photo</Text>}
        {discount > 0 && <Text style={s.discount}>{discount}% OFF</Text>}
      </View>
      <Text numberOfLines={1} style={s.store}>{product.storeName}</Text>
      <Text numberOfLines={2} style={s.name}>{product.name}</Text>
      <View style={s.prices}><Text style={s.price}>{money(product.price)}</Text>
        {discount > 0 && <Text style={s.mrp}>{money(product.mrp)}</Text>}
      </View>
    </Pressable>
    {!!onToggleFavorite && <Pressable accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      disabled={isFavoritePending} onPress={onToggleFavorite} style={s.favoriteButton}>
      <Text style={[s.favorite, isFavorite && s.favoriteActive]}>{isFavorite ? '♥' : '♡'}</Text>
    </Pressable>}
  </View>;
}

const s = StyleSheet.create({
  card: { flex: 1, maxWidth: '48%', marginBottom: 22, position: 'relative' },
  main: { gap: 5 },
  visual: { height: 164, borderRadius: 18, backgroundColor: '#F0EFF6', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  placeholder: { color: colors.mutedText, fontSize: 11 },
  discount: { position: 'absolute', left: 9, top: 9, color: '#FFFFFF', backgroundColor: '#263A32', borderRadius: 7, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4, fontSize: 9, fontWeight: '800' },
  store: { color: colors.primary, fontSize: 10, fontWeight: '700', marginTop: 4 },
  name: { color: colors.ink, fontSize: 13, fontWeight: '700', minHeight: 35 },
  prices: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  price: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  mrp: { color: colors.mutedText, fontSize: 11, textDecorationLine: 'line-through' },
  favoriteButton: { position: 'absolute', right: 9, top: 9, width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFFE8', alignItems: 'center', justifyContent: 'center' },
  favorite: { color: colors.ink, fontSize: 23, lineHeight: 26 },
  favoriteActive: { color: '#E94968' },
});
