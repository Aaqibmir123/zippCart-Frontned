import { AppLoader } from '../../components/AppLoader';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FavoriteProductRow } from '../../components/shop/FavoriteProductRow';
import { EmptyWishlist } from '../../features/favorites/EmptyWishlist';
import { TopFeedbackToast } from '../../components/TopFeedbackToast';
import { useTimedFeedback } from '../../hooks/useTimedFeedback';
import { useShopProductLookup } from '../../services/products/product-queries';
import { ShopStackParamList } from '../../navigation/user/shop-routes';
import { isApiError } from '../../services/api/api-error';
import { useFavorites, useToggleFavorite } from '../../services/favorites/favorite-queries';
import { useAddCartItem, useCart } from '../../services/cart/cart-queries';
import { useAppTheme } from '../../theme/ThemeProvider';

export function FavoritesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  const theme = useAppTheme();
  const favoritesQuery = useFavorites();
  const productsQuery = useShopProductLookup(favoritesQuery.data?.favorites.map((item) => item.productId) ?? []);
  const favoriteMutation = useToggleFavorite();
  const addCart = useAddCartItem();
  const cart = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);
  const { feedback, showFeedback } = useTimedFeedback();
  const products = new Map(productsQuery.data?.products.map((product) => [product.id, product]) ?? []);
  const items = favoritesQuery.data?.favorites.map((item) => ({ id: item.productId, product: products.get(item.productId) ?? null })) ?? [];

  async function removeFavorite(productId: string) {
    try { await favoriteMutation.mutateAsync({ isFavorite: true, productId }); showFeedback('Removed from favorites', 'success', 'favoriteRemoved'); }
    catch (error) { showFeedback(isApiError(error) ? error.message : 'Could not remove this product.', 'error'); }
  }
  async function addToCart(productId: string) {
    if (cart.data?.items.some((item) => item.productId === productId)) {
      navigation.navigate('ShopTabs', { screen: 'Cart' }); return;
    }
    if (cart.isError) { void cart.refetch(); return; }
    if (cart.isPending || cart.isFetching) return;
    if (addingId) return;
    setAddingId(productId);
    try {
      const product = products.get(productId);
      if (!product) {
        showFeedback('This product is no longer available.', 'error');
        return;
      }
      if (product.hasVariants) {
        navigation.navigate('ProductDetails', { productId });
        return;
      }
      if (product.stock < 1) {
        showFeedback('This product is out of stock.', 'error');
        return;
      }
      await addCart.mutateAsync({ productId, color: '', size: '' });
      showFeedback('Added to cart', 'success');
    } catch (error) { showFeedback(isApiError(error) ? error.message : 'Could not add this product.', 'error'); }
    finally { setAddingId(null); }
  }
  const loading = favoritesQuery.isLoading;
  const failed = favoritesQuery.isError && !favoritesQuery.data;
  const status = favoritesQuery.isFetching || productsQuery.isFetching
    ? 'Updating wishlist…'
    : cart.isPending || cart.isFetching ? 'Checking cart…' : null;
  return <SafeAreaView edges={['top']} style={[s.page, { backgroundColor: theme.colors.background }]}>
    <View style={[s.header, { backgroundColor: theme.colors.surface }]}>
      <Text accessibilityRole="header" style={[s.heading, { color: theme.colors.text }]}>Wishlist</Text>
      {!!items.length && !!status && <Text accessibilityLiveRegion="polite" style={[s.status, { color: theme.colors.muted }]}>{status}</Text>}
      {!!items.length && productsQuery.isError && <Pressable accessibilityRole="button" onPress={() => void productsQuery.refetch()}>
        <Text accessibilityRole="alert" style={[s.status, { color: theme.colors.muted }]}>Product details unavailable. Tap to retry.</Text>
      </Pressable>}
    </View>
    {loading ? <View style={s.center}><AppLoader variant="section" accessibilityLabel="Loading wishlist" color={theme.colors.primary} /></View> : failed ? <View style={s.center}><Text style={[s.title, { color: theme.colors.text }]}>Could not load wishlist</Text><Pressable accessibilityRole="button" onPress={() => void favoritesQuery.refetch()} style={[s.button, { backgroundColor: theme.colors.primary }]}><Text style={s.buttonText}>Try again</Text></Pressable></View> :
      <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={[items.length ? s.list : s.empty, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyWishlist onExplore={() => navigation.navigate('ShopTabs', { screen: 'Home' })} />}
        renderItem={({ item }) => <FavoriteProductRow product={item.product} productLoading={productsQuery.isFetching && !item.product} onOpenProduct={() => navigation.navigate('ProductDetails', { productId: item.id })} onRemove={() => void removeFavorite(item.id)} onAdd={() => void addToCart(item.id)} removing={favoriteMutation.isPending} adding={addingId === item.id} addDisabled={addingId !== null}
          inCart={cart.data?.items.some((record) => record.productId === item.id) ?? false} cartLoading={cart.isPending || cart.isFetching} cartError={cart.isError} />} />}
    <TopFeedbackToast feedback={feedback} />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20, backgroundColor: '#FFFFFF' },
  status: { fontSize: 12, marginTop: 7 },
  heading: { color: '#241440', fontSize: 29, fontWeight: '800', letterSpacing: -0.7 },
  page: { flex: 1, backgroundColor: '#F8F5FB' }, list: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 28, gap: 11 }, empty: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26 }, title: { color: '#302040', fontSize: 19, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  button: { backgroundColor: '#8533D6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, marginTop: 20 }, buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
