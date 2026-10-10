import { orderTheme as t } from '../../../features/orders/order-theme';
import Svg, { Path } from 'react-native-svg';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ShopProduct } from '../../../services/api/product-api';
import { colors } from '../../../theme';
import { money } from '../../../utils/money';
import { useAppTheme } from '../../../theme/ThemeProvider';

type Props = { isPending: boolean; onQuantityChange: (quantity: number) => void; onRemove: () => void; onOpen: () => void; product: ShopProduct; quantity: number; color: string; size: string; maxQuantity: number; stockMessage: string | null };
export function CartItemRow({ isPending, onQuantityChange, onRemove, onOpen, product, quantity, color, size, maxQuantity, stockMessage }: Props) {
  const theme = useAppTheme();
  const increaseDisabled = isPending || quantity >= maxQuantity;
  const decreaseRemoves = quantity === 1 || maxQuantity === 0;
  const decreasedQuantity = Math.min(quantity - 1, maxQuantity);
  return <View style={[s.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    <View style={s.main}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}`} onPress={onOpen} style={[s.visual, { backgroundColor: theme.colors.raised }]}>{product.coverImage ? <Image source={{ uri: product.coverImage }} style={s.image} /> : <Text style={[s.fallback, { color: theme.colors.muted }]}>No photo</Text>}</Pressable>
      <View style={s.copy}>
        <Text style={[s.category, { color: theme.colors.muted }]}>{product.category.toUpperCase()}</Text>
        <Pressable accessibilityRole="button" onPress={onOpen}><Text numberOfLines={2} style={[s.name, { color: theme.colors.text }]}>{product.name}</Text></Pressable>
        {!!(color || size) && <Text style={[s.tax, { color: theme.colors.muted }]}>{[color, size].filter(Boolean).join(' · ')}</Text>}
        <View style={s.prices}><Text style={[s.price, { color: theme.colors.text }]}>{money(product.price)}</Text>{product.mrp > product.price && <Text style={[s.original, { color: theme.colors.muted }]}>{money(product.mrp)}</Text>}</View>
        <Text style={[s.tax, { color: theme.colors.muted }]}>Per item · taxes included</Text>
      </View>
    </View>
    <View style={s.controls}>
      <Text style={[s.tax, { color: theme.colors.muted }]}>Quantity</Text>
      <View style={[s.quantity, { backgroundColor: theme.colors.raised }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={decreaseRemoves ? `Delete ${product.name} from cart` : `Decrease quantity of ${product.name} to ${decreasedQuantity}`}
          disabled={isPending}
          onPress={() => decreaseRemoves ? onRemove() : onQuantityChange(decreasedQuantity)}
          style={[s.quantityButton, { backgroundColor: theme.colors.raised }, decreaseRemoves && s.deleteButton, isPending && s.disabled]}
        >
          {decreaseRemoves ? (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" stroke="#B64D68" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          ) : <Text style={[s.quantityText, { color: theme.colors.primary }]}>{'\u2212'}</Text>}
        </Pressable>
        <Text accessibilityLabel={`Quantity ${quantity}`} style={[s.quantityValue, { color: theme.colors.text }]}>{quantity}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Increase quantity of ${product.name}`} accessibilityState={{ disabled: increaseDisabled }} disabled={increaseDisabled} onPress={() => onQuantityChange(quantity + 1)} style={[s.quantityButton, { backgroundColor: theme.colors.raised }, increaseDisabled && s.disabled]}><Text style={[s.quantityText, { color: theme.colors.primary }]}>+</Text></Pressable>
      </View>

    </View>
    {!!stockMessage && <Text accessibilityRole="alert" style={s.stockError}>{stockMessage}</Text>}
    {!stockMessage && quantity >= maxQuantity && <Text style={[s.tax, { color: theme.colors.muted }]}>Maximum available quantity reached</Text>}
    {quantity > 1 && <View style={s.lineTotal}><Text style={[s.tax, { color: theme.colors.muted }]}>Item total · {quantity} units</Text><Text style={[s.linePrice, { color: theme.colors.text }]}>{money(product.price * quantity)}</Text></View>}
  </View>;
}
const s = StyleSheet.create({
  item: {
    backgroundColor: t.surface,
    borderColor: t.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#32234D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  main: { flexDirection: 'row' },
  visual: { alignItems: 'center', borderRadius: 17, height: 92, justifyContent: 'center', width: 82, borderWidth: 1, borderColor: '#FFFFFF70', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  fallback: { color: t.muted, fontSize: 10 },
  copy: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  category: { fontSize: 9, letterSpacing: 1, color: '#786B96', fontWeight: '700', marginBottom: 5 },
  name: { color: t.ink, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  prices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center', marginTop: 8 },
  price: { color: t.ink, fontSize: 17, fontWeight: '800' },
  original: { color: '#82778F', fontSize: 11, textDecorationLine: 'line-through' },
  tax: { color: '#786B88', fontSize: 10, marginTop: 4 },
  controls: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#DFD8EE', paddingTop: 12, marginTop: 14 },
  quantity: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', padding: 3 },
  quantityButton: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 12 },
  deleteButton: { backgroundColor: '#FBE4EB' },
  quantityText: { color: t.primary, fontSize: 20, fontWeight: '600' },
  quantityValue: { color: t.ink, fontSize: 13, fontWeight: '800', minWidth: 22, textAlign: 'center' },
  disabled: { opacity: 0.35 },
  stockError: { color: '#A43E58', fontSize: 12, lineHeight: 18, marginTop: 10 },
  lineTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  linePrice: { color: t.ink, fontSize: 13, fontWeight: '700' },
});
