import { AppLoader } from '../../components/AppLoader';
import { useCallback } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopFeedbackToast } from '../../components/TopFeedbackToast';
import { HomeProductCard } from '../home/HomeProductCard';
import { WishlistStatus } from '../home/WishlistStatus';
import { useHomeCatalog } from '../home/useHomeCatalog';
import { ShopStackParamList } from '../../navigation/user/shop-routes';
import { h, palette } from '../home/home.styles';
import { useAppTheme } from '../../theme/ThemeProvider';

type Route = RouteProp<ShopStackParamList, 'ProductListing'>;

export function ProductListingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  const route = useRoute<Route>();
  const openProduct = useCallback((productId: string) => navigation.navigate('ProductDetails', { productId }), [navigation]);
  const catalog = useHomeCatalog(openProduct, route.params.category ?? 'All');
  const theme = useAppTheme();
  const { query, products } = catalog;
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 4 : 2;
  const cardWidth = (width - 32 - (columns - 1) * 12) / columns;
  const retry = <Pressable accessibilityRole="button" style={h.retry} disabled={query.isFetching}
    onPress={() => void query.refetch()}><Text style={[h.link, { color: theme.colors.primary }]}>Try again</Text></Pressable>;

  return <SafeAreaView style={[h.page, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
    <FlatList key={`${catalog.category}-${columns}`} data={products} keyExtractor={(item) => item.id}
      numColumns={columns} columnWrapperStyle={h.productRow} contentContainerStyle={[h.content, { backgroundColor: theme.colors.background }]}
      onEndReached={() => { if (query.hasNextPage && !query.isFetching) void query.fetchNextPage({ cancelRefetch: false }); }}
      onEndReachedThreshold={0.35}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => { void query.refetch(); void catalog.favorites.refetch(); }}
      ListHeaderComponent={<View style={[h.hero, { backgroundColor: theme.colors.background }]}>
        <View style={h.brandRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={h.iconButton}
            onPress={() => navigation.goBack()}><Text style={[h.heading, { color: theme.colors.text }]}>←</Text></Pressable>
          <Text style={[h.heading, { color: theme.colors.text }]}>{route.params.title}</Text>
        </View>
        {query.isError && !query.isFetchNextPageError && products.length > 0 && <View style={h.state}>
          <Text style={[h.hint, { color: theme.colors.muted }]}>Could not refresh products.</Text>{retry}
        </View>}
        <WishlistStatus pending={catalog.favorites.isPending} fetching={catalog.favorites.isFetching}
          error={catalog.favorites.isError} onRetry={() => void catalog.favorites.refetch()} />
      </View>}
      ListEmptyComponent={<View style={h.state}>
        {query.isPending ? <AppLoader accessibilityLabel="Loading products" color={palette.pink} /> :
          query.isError ? <><Text style={[h.hint, { color: theme.colors.muted }]}>Could not load products.</Text>{retry}</> :
            <Text style={[h.hint, { color: theme.colors.muted }]}>No products found in this category.</Text>}
      </View>}
      renderItem={({ item }) => <HomeProductCard product={item} width={cardWidth}
        favorite={catalog.favoriteIds.has(item.id)}
        favoritePending={catalog.pendingFavoriteIds.has(item.id)} favoriteDisabled={!catalog.favorites.isSuccess}
        onOpen={openProduct} onFavorite={catalog.toggleFavorite}
        onAdd={catalog.addToCart} />}
      ListFooterComponent={query.hasNextPage ? <Pressable accessibilityRole="button"
        style={[h.state, query.isFetching && h.disabled]} disabled={query.isFetching}
        onPress={() => { if (!query.isFetching) void query.fetchNextPage({ cancelRefetch: false }); }}>
        {query.isFetchingNextPage ? <AppLoader accessibilityLabel="Loading more products" color={palette.pink} /> :
          <Text style={[h.link, { color: theme.colors.primary }]}>{query.isFetchNextPageError ? 'Could not load more. Try again' : 'Load more products'}</Text>}
      </Pressable> : null} />
    <TopFeedbackToast feedback={catalog.feedback} />
  </SafeAreaView>;
}
