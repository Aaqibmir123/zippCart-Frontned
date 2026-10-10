import { AppLoader } from '../../components/AppLoader';
import { ShoppingTabHeader } from '../../components/shop/ShoppingTabHeader';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartAddressSection, CartItemRow } from '../../components/shop/cart';
import { TopFeedbackToast } from '../../components/TopFeedbackToast';
import { useCartScreen } from '../../hooks/useCartScreen';
import { ShopStackParamList } from '../../navigation/user/shop-routes';
import { colors } from '../../theme';
import { cartScreenStyles as s } from './cart-screen.styles';
import { useAppTheme } from '../../theme/ThemeProvider';
import { money } from '../../utils/money';

export function CartScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  const cart = useCartScreen();

  return (
    <SafeAreaView edges={['top']} style={[s.page, { backgroundColor: theme.colors.background }]}>
      <ShoppingTabHeader title="Your Cart" subtitle={`${cart.quantity} ${cart.quantity === 1 ? 'item' : 'items'}`} action="heart" onAction={() => navigation.navigate('ShopTabs', { screen: 'Favorites' })} />
      {cart.cartQuery.isLoading ? (
        <View style={s.center}><AppLoader variant="section" accessibilityLabel="Loading cart" color={colors.primary} /></View>
      ) : cart.cartQuery.isError || cart.productQuery.isError ? (
        <View style={s.center}>
          <Text style={[s.emptyTitle, { color: theme.colors.text }]}>Could not load your cart</Text>
          <Pressable accessibilityRole="button" disabled={cart.cartQuery.isFetching} onPress={() => { void cart.refresh(); }} style={[s.retry, { borderColor: theme.colors.primary }]}>
            {cart.cartQuery.isFetching ? <AppLoader color={theme.colors.primary} /> : <Text style={[s.retryText, { color: theme.colors.primary }]}>Try again</Text>}
          </Pressable>
        </View>
      ) : cart.items.length === 0 ? (
        <View style={s.center}>
          <View style={[s.emptyCircle, { backgroundColor: theme.colors.raised }]}><Text style={[s.emptyMark, { color: theme.colors.primary }]}>＋</Text></View>
          <Text style={[s.emptyTitle, { color: theme.colors.text }]}>Your cart is empty</Text>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ShopTabs', { screen: 'Home' })} style={[s.retry, { borderColor: theme.colors.primary }]}>
            <Text style={[s.retryText, { color: theme.colors.primary }]}>Continue shopping</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[s.list, { backgroundColor: theme.colors.background }]}
          data={cart.items}
          keyExtractor={(item) => item.id}
          refreshing={(cart.cartQuery.isRefetching || cart.productQuery.isRefetching) && !cart.pending}
          onRefresh={() => { void cart.refresh(); }}
          renderItem={({ item }) => (
            cart.productLookupPending && !item.productKnown ? <CartItemSkeleton key={item.id} theme={theme} /> : <CartItemRow
              onOpen={() => navigation.navigate('ProductDetails', { productId: item.product.id })}
              isPending={cart.pending || (cart.productLookupPending && !item.productKnown)}
              onQuantityChange={(value) => void cart.changeQuantity(item.id, value)}
              onRemove={() => void cart.removeItem(item.id)}
              product={item.product}
              color={item.color}
              size={item.size}
              quantity={item.quantity}
              maxQuantity={item.maxQuantity}
              stockMessage={item.stockMessage}
            />
          )}
          ListFooterComponent={
            <View style={s.footer}>
              <CartAddressSection open={cart.addressOpen} onOpenChange={cart.setAddressOpen} onReadyChange={cart.setAddressReady} />
              {cart.productLookupPending
                ? <Text style={[s.availabilityNote, { color: theme.colors.muted }]}>Checking current prices and stock before checkout…</Text>
                : <>
                  <View style={[s.cartSummary, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={[s.cartTotal, { borderTopColor: theme.colors.border }]}>
                      <Text style={[s.cartTotalLabel, { color: theme.colors.text }]}>Subtotal</Text>
                      <Text style={[s.cartTotalValue, { color: theme.colors.text }]}>{money(cart.total)}</Text>
                    </View>
                    <View style={s.cartTotal}>
                      <Text style={[s.cartTotalLabel, { color: theme.colors.muted }]}>Delivery</Text>
                      <Text style={[s.deliveryFree, { color: theme.colors.primary }]}>FREE</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !cart.addressReady || cart.checkoutBlocked || cart.pending || cart.cartQuery.isFetching || cart.productQuery.isFetching }}
                      disabled={!cart.addressReady || cart.checkoutBlocked || cart.pending || cart.cartQuery.isFetching || cart.productQuery.isFetching}
                      onPress={() => {
                        if (cart.addressReady) navigation.navigate('Checkout', { address: cart.addressReady });
                      }}
                      style={[s.checkoutButton, { backgroundColor: theme.colors.primary },
                        (!cart.addressReady || cart.checkoutBlocked || cart.pending || cart.cartQuery.isFetching || cart.productQuery.isFetching) && s.checkoutDisabled]}>
                      <Text style={s.checkoutButtonText}>Continue to checkout</Text>
                      <Text style={s.checkoutArrow}>→</Text>
                    </Pressable>
                  </View>
                </>}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      <TopFeedbackToast feedback={cart.feedback} />
    </SafeAreaView>
  );
}

function CartItemSkeleton({ theme }: { theme: ReturnType<typeof useAppTheme> }) {
  const bar = { backgroundColor: theme.colors.raised, borderRadius: 6 } as const;
  return <View accessibilityLabel="Loading cart item" style={[s.skeletonCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    <View style={[s.skeletonImage, bar]} />
    <View style={s.skeletonCopy}>
      <View style={[s.skeletonCategory, bar]} />
      <View style={[s.skeletonName, bar]} />
      <View style={[s.skeletonPrice, bar]} />
    </View>
    <View style={[s.skeletonControls, bar]} />
  </View>;
}
