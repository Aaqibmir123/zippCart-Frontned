import { AppLoader } from '../../AppLoader';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CheckoutAddress } from '../../../services/api/order-api';
import { useCheckoutQuote, usePlaceOrder } from '../../../services/orders/order-queries';
import { PaymentMethods } from './PaymentMethods';
import { checkoutStyles as s } from '../../../screens/user/checkout/checkout.styles';
import { useAppTheme } from '../../../theme/ThemeProvider';

export function InlineCheckout({ address, revision, blocked, busy, onAddress, onBusy, onSuccess }: {
  address: CheckoutAddress | null; revision: number; blocked: boolean; busy: boolean;
  onAddress: () => void; onBusy: (value: boolean) => void; onSuccess: (id: string) => void;
}) {
  const theme = useAppTheme();
  const quote = useCheckoutQuote(address, revision, !blocked && !busy);
  const place = usePlaceOrder();
  const lock = useRef(false);
  const details = quote.data?.quote;
  const disabled = !address || busy || blocked || place.isPending || quote.isFetching || quote.isPlaceholderData || !details || quote.isError;
  async function submit() {
    if (lock.current || disabled || !address || !details) return;
    lock.current = true; onBusy(true);
    try {
      const result = await place.mutateAsync({ ...address, checkoutKey: details.checkoutKey, paymentMethod: 'cod' });
      onSuccess(result.order.id);
    } catch { /* Preserve the same checkout key so a retry cannot duplicate an order. */ }
    finally { lock.current = false; onBusy(false); }
  }
  return <>
    <PaymentMethods selected onSelect={() => undefined} disabled={place.isPending} />
    {blocked && <Text accessibilityRole="alert" style={s.errorCopy}>Review unavailable items or quantities to continue.</Text>}
    {quote.isError && address && <View><Text accessibilityRole="alert" style={s.errorCopy}>{quote.error.message}</Text>
      <Pressable accessibilityRole="button" disabled={busy || quote.isFetching} onPress={() => void quote.refetch()} style={s.retry}><Text style={[s.link, { color: theme.colors.primary }]}>Try again</Text></Pressable></View>}
    {!address && <Pressable accessibilityRole="button" onPress={onAddress} style={s.retry}><Text style={[s.link, { color: theme.colors.primary }]}>Choose a delivery address</Text></Pressable>}
    {place.isError && <Text accessibilityRole="alert" style={s.errorCopy}>{place.error.message}</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: place.isPending }} disabled={disabled}
      onPress={() => void submit()} style={[s.place, { backgroundColor: theme.colors.primary }, disabled && s.disabled]}>
      {place.isPending ? <AppLoader color="#fff" accessibilityLabel="Placing order" /> : <Text style={s.placeText}>Place Order →</Text>}
    </Pressable>
  </>;
}
