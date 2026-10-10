import { AppLoader } from '../../AppLoader';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../../theme';
import { useAppTheme } from '../../../theme/ThemeProvider';

import { money } from '../../../utils/money';

type Props = { subtotal: number; mrp: number; quantity: number; onCheckout: () => void; pending: boolean; blocked?: boolean };
export function CartPriceSummary({ subtotal, mrp, quantity, onCheckout, pending, blocked = false }: Props) {
  const theme = useAppTheme();
  const savings = Math.max(0, mrp - subtotal);
  return <View style={[s.wrapper, { backgroundColor: theme.colors.background }]}>
    {savings > 0 && <View style={s.savings}><Text style={s.savingsMark}>✦</Text><Text style={s.savingsText}>You're saving {money(savings)} on this order</Text></View>}
    <View style={[s.receipt, { backgroundColor: theme.colors.surface }]}>
      <View style={s.header}><Text style={[s.title, { color: theme.colors.text }]}>Price details</Text><Text style={[s.count, { color: theme.colors.muted }]}>{quantity} {quantity === 1 ? 'item' : 'items'}</Text></View>
      <Row label="Total MRP" value={money(mrp)} theme={theme} />
      {savings > 0 && <Row label="Product discount" value={`− ${money(savings)}`} positive theme={theme} />}
      <Row label="Subtotal" value={money(subtotal)} theme={theme} />
      <Row label="GST / taxes" value="Included in prices" theme={theme} />
      <Row label="Delivery charges" value="Calculated at checkout" theme={theme} />
      <View style={[s.divider, { borderColor: theme.colors.border }]} />
      <View style={s.totalRow}><Text style={[s.totalLabel, { color: theme.colors.text }]}>Estimated total</Text><Text style={[s.total, { color: theme.colors.text }]}>{money(subtotal)}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Checkout" accessibilityState={{ busy: pending, disabled: pending || blocked }} disabled={pending || blocked} onPress={onCheckout} style={({ pressed }) => [s.checkout, { backgroundColor: theme.colors.primary }, (pending || blocked || pressed) && s.disabled]}>
        {pending ? <AppLoader color="white" /> : <><Text style={s.checkoutText}>Checkout</Text><Text style={s.checkoutArrow}>{"\u2192"}</Text></>}
      </Pressable>
      {blocked && <Text accessibilityRole="alert" style={s.stockError}>Reduce quantities or remove unavailable items to continue.</Text>}
    </View>
    <Svg width="100%" height={12} viewBox="0 0 360 12" preserveAspectRatio="none"><Path d="M0 0H360V4Q354 16 348 4Q342 16 336 4Q330 16 324 4Q318 16 312 4Q306 16 300 4Q294 16 288 4Q282 16 276 4Q270 16 264 4Q258 16 252 4Q246 16 240 4Q234 16 228 4Q222 16 216 4Q210 16 204 4Q198 16 192 4Q186 16 180 4Q174 16 168 4Q162 16 156 4Q150 16 144 4Q138 16 132 4Q126 16 120 4Q114 16 108 4Q102 16 96 4Q90 16 84 4Q78 16 72 4Q66 16 60 4Q54 16 48 4Q42 16 36 4Q30 16 24 4Q18 16 12 4Q6 16 0 4Z" fill={theme.colors.surface} /></Svg>
  </View>;
}
function Row({ label, value, positive = false, theme }: { label: string; value: string; positive?: boolean; theme: ReturnType<typeof useAppTheme> }) {
  return <View style={s.row}><Text style={[s.rowLabel, { color: theme.colors.muted }]}>{label}</Text><Text style={[s.rowValue, { color: theme.colors.text }, positive && s.positive]}>{value}</Text></View>;
}
const s = StyleSheet.create({
  wrapper: { marginTop: 4 }, savings: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#E3F5EC', padding: 14, borderTopLeftRadius: 20, borderTopRightRadius: 20 }, savingsMark: { fontSize: 22, color: '#16845E' }, savingsText: { flex: 1, color: '#13724F', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  receipt: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, title: { color: colors.ink, fontSize: 17, fontWeight: '800' }, count: { color: colors.mutedText, fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8 }, rowLabel: { flex: 1, color: colors.mutedText, fontSize: 12, lineHeight: 18 }, rowValue: { flex: 1, textAlign: 'right', color: colors.ink, fontSize: 12, fontWeight: '600', lineHeight: 18 }, positive: { color: '#16845E' }, divider: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#DCD7E9', marginVertical: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, totalLabel: { color: colors.ink, fontSize: 15, fontWeight: '800' }, total: { color: colors.ink, fontSize: 23, fontWeight: '900' }, checkout: { marginTop: 18, minHeight: 54, borderRadius: 16, backgroundColor: colors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  checkoutText: { color: 'white', fontSize: 15, fontWeight: '800' }, checkoutArrow: { color: '#C7C9FF', fontSize: 22 }, disabled: { opacity: 0.55 },
  stockError: { color: '#A43E58', fontSize: 12, lineHeight: 18, marginTop: 10 },
});
