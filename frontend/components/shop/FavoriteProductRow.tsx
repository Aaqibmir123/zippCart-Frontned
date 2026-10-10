import { AppLoader } from '../AppLoader';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ShopProduct } from '../../services/api/product-api';
import { money } from '../../utils/money';
import { HomeIcon } from '../../features/home/HomeIcon';
import { useAppTheme } from '../../theme/ThemeProvider';

export function FavoriteProductRow({ product, productLoading = false, onOpenProduct, onRemove, onAdd, removing, adding, addDisabled = false, inCart = false, cartLoading = false, cartError = false }: {
  product: ShopProduct | null; productLoading?: boolean; onOpenProduct: () => void; onRemove: () => void; onAdd: () => void; removing: boolean; adding: boolean; addDisabled?: boolean;
  inCart?: boolean; cartLoading?: boolean; cartError?: boolean;
}) {
  const theme = useAppTheme();
  const discount = product && product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;
  const disabled = adding || addDisabled || (!inCart && (cartLoading || !product || product.stock < 1));
  const actionText = inCart ? 'Go to Cart' : cartError ? 'Retry cart' : product && product.stock > 0 ? 'Add to Cart' : 'Out of stock';
  return <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${product?.name ?? 'product'}`} disabled={!product} onPress={onOpenProduct} style={[s.visual, theme.isDark && { backgroundColor: theme.colors.raised }]}>
      {product?.coverImage ? <Image source={{ uri: product.coverImage }} style={s.image} resizeMode="cover" /> : <Text style={[s.placeholder, { color: theme.colors.muted }]}>{productLoading ? 'Loading…' : 'Photo unavailable'}</Text>}
    </Pressable>
    <View style={s.content}>
      <View style={s.top}><Pressable accessibilityRole="button" disabled={!product} onPress={onOpenProduct} style={s.identity}>
        <Text numberOfLines={1} style={[s.brand, { color: theme.colors.text }]}>{product?.brand || product?.storeName || (productLoading ? 'Loading product…' : 'Unavailable product')}</Text>
        <Text numberOfLines={2} style={[s.name, { color: theme.colors.muted }]}>{product?.name ?? (productLoading ? 'Fetching item details…' : 'This item is no longer available')}</Text>
      </Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${product?.name ?? 'item'} from wishlist`} accessibilityState={{ disabled: removing }} disabled={removing} onPress={onRemove} style={s.heart}><HomeIcon name="heart" size={20} color="#F22B85" filled /></Pressable></View>
      {!!product && <>
        <Text accessibilityLiveRegion="polite" style={inCart ? s.inCart : [s.category, { color: theme.colors.muted }]}>{inCart ? '\u2713 Already added to cart' : product.category}</Text>
        <View style={s.prices}><Text style={[s.price, { color: theme.colors.text }]}>{money(product.price)}</Text>{discount > 0 && <><Text style={s.mrp}>{money(product.mrp)}</Text><Text style={s.discount}>{discount}% OFF</Text></>}</View>
        <View style={s.bottom}><Pressable accessibilityRole="button" onPress={onOpenProduct} style={s.details}><Text style={[s.detailsText, { color: theme.colors.primary }]}>View details</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${actionText}: ${product.name}`} accessibilityState={{ disabled, busy: adding }} disabled={disabled} onPress={onAdd} style={[s.add, { backgroundColor: theme.colors.primary }, inCart && s.inCartButton, disabled && s.disabled]}>{adding ? <AppLoader color="#FFFFFF" size="small" /> : <Text style={s.addText}>{actionText}</Text>}</Pressable>
        </View>
      </>}
    </View>
  </View>;
}
const s = StyleSheet.create({
  inCart: { color: '#187951', fontSize: 10, fontWeight: '700', marginTop: 5 },
  inCartButton: { backgroundColor: '#256F55' },
  card: { flexDirection: 'row', gap: 11, padding: 8, borderRadius: 13, borderWidth: 1, borderColor: '#EEE6F2', backgroundColor: '#FFFFFF' },
  visual: { width: '29%', minHeight: 143, borderRadius: 9, overflow: 'hidden', backgroundColor: '#F0E8F3', justifyContent: 'center', alignItems: 'center' }, image: { width: '100%', height: '100%', position: 'absolute' }, placeholder: { fontSize: 10, color: '#A394AD', textAlign: 'center', padding: 5 },
  content: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 }, top: { flexDirection: 'row', gap: 4 }, identity: { flex: 1, paddingTop: 4 }, brand: { fontSize: 13, fontWeight: '800', color: '#29213F' }, name: { fontSize: 11, lineHeight: 16, color: '#797184', marginTop: 3 },
  heart: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' }, category: { color: '#9B84B0', fontSize: 10, marginTop: 5 },
  prices: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 6 }, price: { color: '#25203A', fontSize: 17, fontWeight: '900' }, mrp: { fontSize: 10, color: '#A9A1B1', textDecorationLine: 'line-through' }, discount: { color: '#189B6E', fontSize: 9, fontWeight: '800' },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 6, flexWrap: 'wrap' }, details: { minHeight: 36, justifyContent: 'center' }, detailsText: { fontSize: 10, color: '#9277AE', fontWeight: '600' },
  add: { minWidth: 102, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#852ACE' }, addText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' }, disabled: { opacity: 0.5 },
});
