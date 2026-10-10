import { Pressable, Text, View } from 'react-native';
import { checkoutStyles as s } from '../../../screens/user/checkout/checkout.styles';
import { useAppTheme } from '../../../theme/ThemeProvider';

export function PaymentMethods({ selected, onSelect, disabled }: { selected: boolean; onSelect: () => void; disabled: boolean }) {
  const theme = useAppTheme();
  return <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    <Text style={[s.heading, { color: theme.colors.text }]}>Payment Method</Text>
    <View accessibilityRole="radiogroup" style={s.payments}>
      <Pressable accessibilityRole="radio" accessibilityLabel="Cash on delivery" accessibilityState={{ checked: selected, disabled }}
        disabled={disabled} onPress={onSelect} style={[s.payment, { backgroundColor: theme.colors.raised, borderColor: theme.colors.border }, selected && { borderColor: theme.colors.primary }, disabled && s.disabled]}>
        <View style={[s.radio, selected && s.radioSelected]}>{selected && <View style={s.radioDot} />}</View>
        <Text style={[s.paymentTitle, { color: theme.colors.text }]}>Cash on Delivery</Text><Text style={[s.paymentHint, { color: theme.colors.muted }]}>Pay at your doorstep</Text>
      </Pressable>
      <Pressable accessibilityRole="radio" accessibilityLabel="Pay now, coming soon"
        accessibilityState={{ checked: false, disabled: true }} disabled
        style={[s.payment, { backgroundColor: theme.colors.raised, borderColor: theme.colors.border }, s.unavailable]}>
        <View style={[s.radio, { borderColor: theme.colors.muted }]} />
        <Text style={[s.paymentTitle, { color: theme.colors.text }]}>Pay Now</Text>
        <Text style={[s.paymentHint, { color: theme.colors.muted }]}>Online payment</Text>
        <Text style={s.soon}>Coming soon</Text>
      </Pressable>
    </View>
  </View>;
}
