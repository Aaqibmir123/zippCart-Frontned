import { AppLoader } from '../../components/AppLoader';
import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Order } from '../../services/api/order-api';
import { useCancelOrder } from '../../services/orders/order-queries';
import { supportContact, supportPhone } from '../../constants/support';
import { orderTheme as t } from './order-theme';
import { useAppTheme } from '../../theme/ThemeProvider';

export function CustomerOrderActions({ order, onBuyAgain }: { order: Order; onBuyAgain: () => void }) {
  const theme = useAppTheme();
  const cancel = useCancelOrder();
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState('');
  const [contactError, setContactError] = useState('');
  const submitting = useRef(false);
  const confirming = useRef(false);
  const dispatched = ['dispatched', 'out_for_delivery'].includes(order.status) ||
    order.shipmentProgress?.some((shipment) => shipment.fulfillmentStatus === 'dispatched');
  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    try { await cancel.mutateAsync({ id: order.id, reason: reason.trim() }); setEditing(false); }
    catch { /* The mutation refreshes the order and exposes a retryable error. */ }
    finally { submitting.current = false; }
  }
  function confirm() {
    if (confirming.current || submitting.current || reason.trim().length < 5) return;
    confirming.current = true;
    Alert.alert('Cancel this order?', 'All items will be cancelled. No payment will be due.', [
      { text: 'Keep order', style: 'cancel', onPress: () => { confirming.current = false; } },
      { text: 'Confirm cancellation', style: 'destructive', onPress: () => { confirming.current = false; void submit(); } },
    ], { cancelable: true, onDismiss: () => { confirming.current = false; } });
  }
  async function contact() {
    setContactError('');
    try { await Linking.openURL(supportPhone ? `tel:${supportPhone}` :
      `mailto:${supportContact.email}?subject=${encodeURIComponent(`Delivery help: order ${order.id}`)}`); }
    catch { setContactError(`Could not open support. Contact ${supportContact.phone} or ${supportContact.email}.`); }
  }
  return <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    {order.status === 'cancelled' && <>
      <Text style={[s.title, { color: theme.colors.text }]}>Order cancelled</Text>
      <Text style={[s.hint, { color: theme.colors.muted }]}>No COD payment is due.</Text>
      {order.cancellation && <Text style={[s.hint, { color: theme.colors.muted }]}>Cancelled by you on {new Date(order.cancellation.at).toLocaleString('en-IN')}{'\n'}Reason: {order.cancellation.reason}</Text>}
    </>}
    {order.canCancel && (editing ? <>
      <Text style={[s.title, { color: theme.colors.text }]}>Cancellation reason</Text>
      <TextInput accessibilityLabel="Cancellation reason" placeholder="Tell us why you want to cancel (at least 5 characters)"
        value={reason} onChangeText={setReason} editable={!cancel.isPending} maxLength={500} multiline style={[s.input, { backgroundColor: theme.colors.raised, borderColor: theme.colors.border, color: theme.colors.text }]} />
      <Pressable accessibilityRole="button" disabled={cancel.isPending || reason.trim().length < 5}
        onPress={confirm} style={[s.button, { backgroundColor: theme.colors.raised }, (cancel.isPending || reason.trim().length < 5) && s.disabled]}>
        {cancel.isPending ? <AppLoader color={theme.colors.primary} /> : <Text style={[s.link, { color: theme.colors.primary }]}>Confirm cancellation</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" disabled={cancel.isPending} onPress={() => setEditing(false)} style={[s.button, { backgroundColor: theme.colors.raised }]}><Text style={[s.link, { color: theme.colors.primary }]}>Keep order</Text></Pressable>
    </> : <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={[s.button, { backgroundColor: theme.colors.raised }]}><Text style={[s.link, { color: theme.colors.primary }]}>Cancel Order</Text></Pressable>)}
    {!!cancel.error && <Text accessibilityRole="alert" style={s.error}>{cancel.error.message}</Text>}
    {dispatched && !order.receivedAt && <>
      <Text style={[s.hint, { color: theme.colors.muted }]}>Dispatch is confirmed. Contact support for cancellation or delivery help.</Text>
      <Pressable accessibilityRole="button" onPress={() => void contact()} style={[s.button, { backgroundColor: theme.colors.raised }]}><Text style={[s.link, { color: theme.colors.primary }]}>Contact Support</Text></Pressable>
    </>}
    {!!contactError && <Text selectable accessibilityRole="alert" style={s.error}>{contactError}</Text>}
    {(order.receivedAt || ['delivered', 'cancelled'].includes(order.status)) && <Pressable accessibilityRole="button" onPress={onBuyAgain} style={[s.button, { backgroundColor: theme.colors.raised }]}>
      <Text style={[s.link, { color: theme.colors.primary }]}>Buy Again</Text>
    </Pressable>}
  </View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 18, gap: 12, borderWidth: 1, borderColor: t.border },
  title: { color: t.ink, fontSize: 16, fontWeight: '800' }, hint: { color: t.muted, fontSize: 12, lineHeight: 19 },
  button: { minHeight: 48, backgroundColor: t.tint, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 12 },
  link: { color: t.primary, fontWeight: '800', fontSize: 13 }, disabled: { opacity: 0.45 },
  input: { minHeight: 90, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12, color: t.ink, textAlignVertical: 'top' },
  error: { color: '#A94E63', fontSize: 12, lineHeight: 18 },
});
