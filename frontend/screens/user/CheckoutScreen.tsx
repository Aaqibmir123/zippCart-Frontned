import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { usePreventRemove } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InlineCheckout } from '../../components/shop/checkout/InlineCheckout';
import { OrderSuccess } from '../../components/shop/checkout/OrderSuccess';
import { useCartScreen } from '../../hooks/useCartScreen';
import { OrderFlowHeader } from '../../features/orders/OrderFlowHeader';
import { ShopStackParamList } from '../../navigation/user/shop-routes';
import { useAppTheme } from '../../theme/ThemeProvider';
import { checkoutStyles as s } from './checkout/checkout.styles';

type Props = NativeStackScreenProps<ShopStackParamList, 'Checkout'>;

export function CheckoutScreen({ navigation, route }: Props) {
  const theme = useAppTheme();
  const cart = useCartScreen();
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  usePreventRemove(placing, () => undefined);

  if (orderId) return <OrderSuccess orderId={orderId}
    onDone={() => navigation.navigate('ShopTabs', { screen: 'Home' })}
    onViewOrder={() => navigation.replace('OrderDetails', { orderId })} />;

  return <SafeAreaView edges={['top']} style={[s.page, { backgroundColor: theme.colors.background }]}>
    <OrderFlowHeader title="Checkout" subtitle="Review your order and payment" onBack={navigation.goBack} disabled={placing} />
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <InlineCheckout address={route.params.address} revision={cart.cartQuery.dataUpdatedAt}
        busy={cart.pending || cart.cartQuery.isFetching || cart.productQuery.isFetching}
        blocked={cart.checkoutBlocked} onAddress={navigation.goBack}
        onBusy={setPlacing} onSuccess={setOrderId} />
    </ScrollView>
  </SafeAreaView>;
}
