import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme';
import { useAppTheme } from '../../theme/ThemeProvider';

type ProductPurchaseBarProps = {
  isAdded: boolean;
  isPending: boolean;
  outOfStock: boolean;
  cartLimitReached: boolean;
  cartLoading: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
  cartStatus?: string;
  storeClosed?: boolean;
  variantSelectionRequired?: boolean;
  selectionPrompt?: string;
};

export function ProductPurchaseBar({ isAdded, isPending, outOfStock, cartLimitReached, cartLoading, onAddToCart, onBuyNow, cartStatus, storeClosed, variantSelectionRequired, selectionPrompt }: ProductPurchaseBarProps) {
  const theme = useAppTheme();
  const cartDisabled = isPending || storeClosed || (!isAdded && (variantSelectionRequired || outOfStock || cartLimitReached || cartLoading));
  const buyDisabled = isPending || storeClosed || variantSelectionRequired || outOfStock;
  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
      {!!cartStatus && <Text accessibilityLiveRegion="polite" style={[styles.status, theme.isDark && { backgroundColor: '#23372F', color: '#8BE0B2' }]}>{'\u2713'} {cartStatus}</Text>}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: cartDisabled }} disabled={cartDisabled} onPress={onAddToCart} style={({ pressed }) => [styles.cartButton, theme.isDark && { backgroundColor: theme.colors.raised, borderColor: theme.colors.border }, pressed && styles.pressed, cartDisabled && styles.disabled]}>
          <Text style={[styles.cartText, { color: theme.colors.primary }]}>{storeClosed ? 'Store closed' : isPending ? 'Adding...' : isAdded ? 'Go to Cart' : variantSelectionRequired ? selectionPrompt ?? 'Choose options' : outOfStock ? 'Out of stock' : cartLoading ? 'Checking cart...' : cartLimitReached ? 'Stock limit reached' : 'Add to Cart'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: buyDisabled }} disabled={buyDisabled} onPress={onBuyNow} style={({ pressed }) => [styles.buyButton, { backgroundColor: theme.colors.primary }, pressed && styles.pressed, buyDisabled && styles.disabled]}>
          <Text style={styles.buyText}>{storeClosed ? 'Store closed' : variantSelectionRequired ? selectionPrompt ?? 'Choose options' : outOfStock ? 'Out of stock' : isPending ? 'Please wait...' : 'ϟ  Buy Now'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.white, borderTopColor: '#EEEAF1', borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  status: { color: '#187951', backgroundColor: '#ECF8F1', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 7, fontSize: 11, lineHeight: 16, fontWeight: '600', marginBottom: 8 },
  cartButton: { alignItems: 'center', borderColor: '#E6B7D0', borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: 8, backgroundColor: '#FFF2F8' },
  buyButton: { alignItems: 'center', backgroundColor: '#7139F5', borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: 8 },
  cartText: { color: '#D13F7A', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  buyText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.4 },
});
