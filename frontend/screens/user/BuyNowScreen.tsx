import { AppLoader } from '../../components/AppLoader';
import { orderTheme as t } from '../../features/orders/order-theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OrderFlowHeader } from '../../features/orders/OrderFlowHeader';
import { InlineCheckout } from '../../components/shop/checkout/InlineCheckout';
import { OrderSuccess } from '../../components/shop/checkout/OrderSuccess';
import { usePreventRemove } from '@react-navigation/native';
import { CartAddressSection } from '../../components/shop/cart';
import { ShopStackParamList } from '../../navigation/user/shop-routes';
import { CheckoutAddress } from '../../services/api/order-api';
import { useShopProduct } from '../../services/products/product-queries';
import { colors } from '../../theme';
import { money } from '../../utils/money';
import { quantityLimit } from '../../services/products/stock';

type Props = NativeStackScreenProps<ShopStackParamList, 'BuyNow'>;
export function BuyNowScreen({ navigation, route }: Props) {
  const query = useShopProduct(route.params.productId);
  const [address, setAddress] = useState<CheckoutAddress | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  usePreventRemove(placing, () => undefined);
  const product = query.data?.product;
  const unavailable = !product || route.params.quantity > quantityLimit(product.stock);
  if (orderId) return <OrderSuccess orderId={orderId}
    onDone={() => navigation.reset({ index: 0, routes: [{ name: 'ShopTabs' }] })}
    onViewOrder={() => navigation.replace('OrderDetails', { orderId })} />;
  return <SafeAreaView edges={['top']} style={s.page}>
    <OrderFlowHeader title="Buy now" subtitle="Review and place your order" onBack={navigation.goBack} disabled={placing} />
    {query.isPending ? <View style={s.center}><AppLoader color={t.primary} /></View> :
      query.isError || !product ? <View style={s.center}><Text style={s.muted}>Product is unavailable.</Text>
        <Pressable onPress={() => void query.refetch()}><Text style={s.link}>Try again</Text></Pressable></View> :
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}><View style={s.row}>{product.coverImage ? <Image source={{ uri: product.coverImage }} style={s.image} /> : <View style={s.image} />}
          <View style={s.copy}><Text style={s.name}>{product.name}</Text><Text style={s.muted}>{[route.params.color, route.params.size].filter(Boolean).join(' · ')}</Text>
            <Text style={s.price}>{money(product.price)}</Text></View></View></View>
        <Text style={s.title}>Delivery address</Text>
        <View pointerEvents={placing ? "none" : "auto"}><CartAddressSection open={addressOpen} onOpenChange={setAddressOpen} onReadyChange={setAddress} /></View>
        <Text style={s.muted}>This checkout contains only this item. Your cart stays unchanged.</Text>
        {unavailable && <Text accessibilityRole="alert" style={s.error}>This quantity is no longer available. Go back to the product to review stock.</Text>}
        <InlineCheckout address={address ? { ...address, buyNow: route.params } : null}
          revision={query.dataUpdatedAt} blocked={unavailable} busy={query.isFetching}
          onAddress={() => setAddressOpen(true)} onBusy={setPlacing} onSuccess={setOrderId} />
      </ScrollView>}
  </SafeAreaView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: t.background }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  content: { padding: 20, gap: 17 }, card: { backgroundColor: '#fff', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: t.border },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' }, image: { width: 78, height: 84, borderRadius: 12, backgroundColor: t.tint },
  copy: { flex: 1, gap: 5 }, title: { color: t.ink, fontSize: 18, fontWeight: '800' },
  name: { color: t.ink, fontSize: 15, fontWeight: '800' }, price: { color: t.ink, fontSize: 18, fontWeight: '900' },
  muted: { color: t.muted, fontSize: 12, lineHeight: 18 }, link: { color: t.primary, fontWeight: '800' },
  button: { backgroundColor: t.primary, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  disabled: { opacity: 0.4 }, error: { color: '#A43E58', fontSize: 12, lineHeight: 18 },
});
