import { AppLoader } from '../../AppLoader';
import { useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Order } from '../../../services/api/order-api';
import { useReorder, useReorderPreview } from '../../../services/orders/order-queries';
import { money } from '../../../utils/money';
import { productQuantity, quantityLimit, stockIssue } from '../../../services/products/stock';
import { useAppTheme } from '../../../theme/ThemeProvider';

export function ReorderSheet({ order, onClose, onAdded }: { order: Order; onClose: () => void; onAdded: () => void }) {
  const theme = useAppTheme();
  const mutation = useReorder();
  const lookup = useReorderPreview(order.id);
  const submitting = useRef(false);
  const key = (item: { productId: string; color: string; size: string }) => `${item.productId}:${item.color}:${item.size}`;
  const products = new Map(lookup.data?.items.map((product) => [key(product), product]) ?? []);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => Object.fromEntries(order.items.map((item) => [key(item), item.quantity])));
  const chosenItems = order.items.map((item) => ({ ...item, quantity: products.get(key(item))?.available ? quantities[key(item)] ?? 0 : 0 }));
  const items = chosenItems.map((item) => {
    const checked = products.get(key(item));
    const product = checked?.available && checked.price !== null ? { ...checked, price: checked.price } : undefined;
    const combinedQuantity = productQuantity(chosenItems, item.productId);
    return { ...item, product, reason: checked?.reason,
      maxQuantity: Math.min(checked?.maxQuantity ?? 0, quantityLimit(product?.stock ?? 0, combinedQuantity - item.quantity)),
      stockMessage: product && item.quantity > 0 ? item.quantity > product.maxQuantity ?
        `Only ${product.maxQuantity} available for this size/color. Reduce the quantity.` : stockIssue(product.stock, combinedQuantity) : null };
  });
  const selected = items.filter((item) => item.product && item.quantity > 0);
  const total = selected.reduce((sum, item) => sum + item.product!.price * item.quantity, 0);
  const count = selected.reduce((sum, item) => sum + item.quantity, 0);
  const blocked = lookup.isPending || lookup.isError || lookup.isFetching || !selected.length || selected.some((item) => !!item.stockMessage);
  function update(id: string, quantity: number) {
    const item = items.find((entry) => key(entry) === id);
    if (!item || mutation.isPending) return;
    setQuantities((current) => ({ ...current, [id]: Math.min(item.maxQuantity, Math.max(0, quantity)) }));
  }
  async function addToCart() {
    if (blocked || submitting.current) return;
    submitting.current = true;
    try {
      await mutation.mutateAsync({ id: order.id, items: selected.map(({ productId, color, size, quantity }) => ({ productId, color, size, quantity })) });
      onAdded();
    } catch { void lookup.refetch(); }
    finally { submitting.current = false; }
  }
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!mutation.isPending) onClose(); }}>
    <SafeAreaView style={[s.page, { backgroundColor: theme.colors.background }]}>
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}><View><Text style={[s.kicker, { color: theme.colors.primary }]}>ORDER #{order.id.slice(-8).toUpperCase()}</Text><Text style={[s.title, { color: theme.colors.text }]}>Buy again</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close reorder" disabled={mutation.isPending} onPress={onClose} style={[s.close, { backgroundColor: theme.colors.raised }]}><Text style={[s.closeText, { color: theme.colors.primary }]}>×</Text></Pressable></View>
      <ScrollView contentContainerStyle={s.content}>
        {lookup.data && <Text style={lookup.data.delivery.serviceable ? [s.hint, { color: theme.colors.muted }] : s.error}>{lookup.data.delivery.message}</Text>}
        {lookup.isPending && <View style={s.lookupState}><AppLoader color={theme.colors.primary} /><Text style={[s.hint, { color: theme.colors.muted }]}>Checking current product availability...</Text></View>}
        {lookup.isError && <View style={s.lookupState}><Text accessibilityRole="alert" style={s.error}>Could not check current products. {lookup.error.message}</Text><Pressable accessibilityRole="button" onPress={() => void lookup.refetch()}><Text style={s.retry}>Try again</Text></Pressable></View>}
        {!lookup.isPending && !lookup.isError && items.map((item) => <View key={key(item)} style={[s.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, !item.product && s.unavailable]}>
          <View style={s.itemTop}><View style={[s.visual, { backgroundColor: theme.colors.raised }]}>{item.product?.coverImage ? <Image source={{ uri: item.product.coverImage }} style={s.image} /> : <Text style={[s.icon, { color: theme.colors.muted }]}>□</Text>}</View><View style={s.copy}><Text style={[s.name, { color: theme.colors.text }]}>{item.product?.name ?? item.name}</Text><Text style={[s.price, { color: theme.colors.muted }]}>{item.product ? money(item.product.price) : 'Currently unavailable'}{item.color || item.size ? ` · ${[item.color, item.size].filter(Boolean).join(' / ')}` : ''}</Text></View></View>
          {item.product && <View style={[s.controls, { borderTopColor: theme.colors.border }]}><Text style={[s.lineTotal, { color: theme.colors.text }]}>{item.quantity ? money(item.product.price * item.quantity) : 'Not selected'}</Text><View style={[s.stepper, { backgroundColor: theme.colors.raised }]}>
            <Pressable accessibilityLabel={`Decrease ${item.name} quantity`} disabled={mutation.isPending || item.quantity === 0} onPress={() => update(key(item), item.quantity - 1)} style={[s.stepButton, (mutation.isPending || item.quantity === 0) && s.disabled]}><Text style={s.stepText}>−</Text></Pressable>
            <Text accessibilityLabel={`Quantity ${item.quantity}`} style={[s.quantity, { color: theme.colors.text }]}>{item.quantity}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${item.name} quantity`} accessibilityState={{ disabled: mutation.isPending || item.quantity >= item.maxQuantity }} disabled={mutation.isPending || item.quantity >= item.maxQuantity} onPress={() => update(key(item), item.quantity + 1)} style={[s.stepButton, (mutation.isPending || item.quantity >= item.maxQuantity) && s.disabled]}><Text style={s.stepText}>+</Text></Pressable>
          </View></View>}
          {!!(item.stockMessage || item.reason) && <Text accessibilityRole="alert" style={s.error}>{item.stockMessage || item.reason}</Text>}
        </View>)}
        {!lookup.isPending && !lookup.isError && !selected.length && <Text style={[s.empty, { color: theme.colors.muted }]}>No available items selected.</Text>}
        {mutation.isError && <Text accessibilityRole="alert" style={s.error}>{mutation.error.message} Please try again.</Text>}
      </ScrollView>
      <View style={[s.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}><View style={s.totalRow}><Text style={[s.hint, { color: theme.colors.muted }]}>{count} {count === 1 ? 'item' : 'items'} selected</Text><Text style={[s.total, { color: theme.colors.text }]}>{money(total)}</Text></View><Pressable accessibilityRole="button" accessibilityState={{ disabled: mutation.isPending || blocked }} disabled={mutation.isPending || blocked} onPress={() => void addToCart()} style={[s.button, { backgroundColor: theme.colors.primary }, (mutation.isPending || blocked) && s.disabled]}>{mutation.isPending ? <AppLoader color="white" /> : <Text style={s.buttonText}>Add selected to cart  →</Text>}</Pressable></View>
    </SafeAreaView>
  </Modal>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F7F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E3EBE6' },
  kicker: { color: '#6B927D', fontSize: 10, letterSpacing: 1, fontWeight: '800' },
  title: { fontSize: 23, fontWeight: '900', color: '#263E3B', marginTop: 5 },
  close: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ECF2EE', alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 24, color: '#426451' },
  content: { padding: 20, paddingBottom: 26, gap: 12 },
  hint: { color: '#7D9085', fontSize: 11, lineHeight: 17 },
  item: { padding: 15, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1EAE4' },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  visual: { width: 66, height: 72, borderRadius: 12, backgroundColor: '#EEF3EF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  icon: { fontSize: 27, color: '#8AA497' }, copy: { flex: 1 },
  name: { color: '#2C4539', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  price: { color: '#648471', fontSize: 12, fontWeight: '700', marginTop: 6 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EDF1EE' },
  lineTotal: { color: '#2C4539', fontSize: 14, fontWeight: '800' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECF4EE', borderRadius: 11 },
  stepButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 20, color: '#347653', fontWeight: '800' },
  quantity: { minWidth: 24, textAlign: 'center', color: '#263E3B', fontWeight: '800' },
  disabled: { opacity: 0.4 }, unavailable: { opacity: 0.65 },
  image: { width: '100%', height: '100%' },
  lookupState: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  retry: { color: '#347653', fontWeight: '800', paddingVertical: 8 },
  empty: { color: '#7D9085', fontSize: 12, textAlign: 'center', padding: 20 },
  footer: { backgroundColor: '#fff', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#E3EBE6' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { color: '#263E3B', fontSize: 23, fontWeight: '900' },
  button: { minHeight: 52, borderRadius: 13, backgroundColor: '#2E6B57', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  error: { color: '#A94E63', backgroundColor: '#FCE8EA', padding: 14, borderRadius: 12, fontSize: 12, lineHeight: 18 },
});
