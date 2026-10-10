import { AppLoader } from '../../components/AppLoader';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileDrawer } from '../../components/ProfileDrawer';
import { SearchPanel } from '../../components/shop/SearchPanel';
import { TopFeedbackToast } from '../../components/TopFeedbackToast';
import { ShopStackParamList, ShopTabParamList } from '../../navigation/user/shop-routes';
import { ShopProduct } from '../../services/api/product-api';
import { HomeHero } from '../../features/home/HomeHero';
import { HomeCategories } from '../../features/home/HomeCategories';
import { HomeProductCard } from '../../features/home/HomeProductCard';
import { HomeSection } from '../../features/home/HomeSection';
import { useProgressiveCatalog } from '../../features/home/useProgressiveCatalog';
import { useHomeCatalog } from '../../features/home/useHomeCatalog';
import { h } from '../../features/home/home.styles';
import { useAppTheme } from '../../theme/ThemeProvider';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  const route = useRoute<RouteProp<ShopTabParamList, 'Home'>>();
  const theme = useAppTheme();
  const mode = route.params?.view ?? 'home';
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [catalogY, setCatalogY] = useState(0);
  const list = useRef<FlatList<ShopProduct>>(null);
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 4 : 2;
  const cardWidth = (width - 32 - (columns - 1) * 12) / columns;
  const openProduct = (id: string) => navigation.navigate('ProductDetails', { productId: id });
  const home = useHomeCatalog(openProduct);
  const { query } = home;
  const offers = home.products.filter((product) => product.mrp > product.price);
  const catalog = mode === 'offers' ? offers : home.products;
  const paging = useProgressiveCatalog(mode + ':' + home.category, catalog.length, query);
  const visible = catalog.slice(0, paging.count);
  const browse = () => list.current?.scrollToOffset({ offset: catalogY, animated: true });
  useEffect(() => {
    home.setCategory('All');
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [mode, home.setCategory]);

  function productCard(product: ShopProduct, itemWidth: number) {
    return <HomeProductCard product={product} width={itemWidth} favorite={home.favoriteIds.has(product.id)}
      favoritePending={home.pendingFavoriteIds.has(product.id) || !home.favorites.isSuccess}
      onOpen={() => openProduct(product.id)} onFavorite={() => void home.toggleFavorite(product.id)}
      onAdd={() => void home.addToCart(product.id)} />;
  }

  return <SafeAreaView edges={['top']} style={[h.page, { backgroundColor: theme.colors.background }]}>
    <FlatList key={columns} ref={list} numColumns={columns} data={visible} keyExtractor={(item) => item.id}
      contentContainerStyle={[h.content, { backgroundColor: theme.colors.background }]} columnWrapperStyle={h.productRow} showsVerticalScrollIndicator={false}
      initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5}
      onScrollBeginDrag={paging.arm} onEndReached={() => void paging.loadMore()} onEndReachedThreshold={0.35}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => { paging.reset(); void query.refetch(); void home.favorites.refetch(); }}
      ListHeaderComponent={<>
        {mode === 'home' ? <HomeHero onSearch={() => setSearch(true)} onProfile={() => setDrawer(true)}
          onShop={browse} onCart={() => navigation.navigate('ShopTabs', { screen: 'Cart' })}
          onNotifications={() => navigation.navigate('Notifications')} />
          : <View style={{ paddingTop: 12 }}><HomeSection title={mode === 'offers' ? 'Offers' : 'Categories'} /></View>}
        <HomeCategories selected={home.category} onSelect={home.setCategory} />
        {home.category !== 'All' && <Pressable accessibilityRole="button" onPress={() => home.setCategory('All')} style={[h.retry, { alignSelf: 'flex-start', marginLeft: 16 }]}>
          <Text style={[h.link, { color: theme.colors.primary }]}>← All categories</Text>
        </Pressable>}
        {home.favorites.isError && <Pressable style={h.retry} onPress={() => void home.favorites.refetch()}>
          <Text style={[h.hint, { color: theme.colors.muted }]}>Wishlist unavailable. Tap to retry.</Text>
        </Pressable>}
        <View onLayout={(event) => setCatalogY(event.nativeEvent.layout.y)}>
          <HomeSection title={home.category !== 'All' ? home.category : mode === 'offers' ? 'Today’s offers' : mode === 'categories' ? 'All products' : 'Discover'}
            onSeeAll={mode === 'home' ? () => navigation.navigate('ShopTabs', { screen: 'Home', params: { view: 'categories' } }) : undefined} />
        </View>
        {query.isError && !query.isFetchNextPageError && home.products.length > 0 && <Pressable style={h.retry} onPress={() => void query.refetch()}><Text style={[h.hint, { color: theme.colors.muted }]}>Could not refresh products. Tap to retry.</Text></Pressable>}
      </>}
      renderItem={({ item }) => productCard(item, cardWidth)}
      ListEmptyComponent={<View style={[h.state, query.isPending && { padding: 0, alignItems: 'stretch' }]}>
        {query.isPending ? <View accessibilityLabel="Loading products" accessibilityLiveRegion="polite" style={{ width: '100%' }}>
          <Text style={[h.hint, { color: theme.colors.muted, textAlign: 'center', marginBottom: 14 }]}>Finding products near you…</Text>
          <View style={h.skeletonGrid}>{Array.from({ length: 6 }, (_, index) =>
            <View key={index} accessible={false} style={[h.skeletonCard, { width: cardWidth, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[h.skeletonImage, { backgroundColor: theme.colors.raised }]} />
              <View style={[h.skeletonLine, { backgroundColor: theme.colors.raised }]} />
              <View style={[h.skeletonShortLine, { backgroundColor: theme.colors.raised }]} />
              <View style={[h.skeletonPriceLine, { backgroundColor: theme.colors.raised }]} />
            </View>)}</View>
        </View>
          : query.isError ? <><Text style={[h.hint, { color: theme.colors.muted }]}>Could not load products.</Text><Pressable onPress={() => void query.refetch()} style={h.retry}><Text style={[h.link, { color: theme.colors.primary }]}>Try again</Text></Pressable></>
          : <Text style={[h.hint, { color: theme.colors.muted }]}>{mode === 'offers' ? (query.hasNextPage ? 'No offers found yet. Explore more below.' : 'No offers right now. Check back soon.') : 'No products in this category.'}</Text>}
      </View>}
      ListFooterComponent={paging.hasMore ? <Pressable accessibilityRole="button" disabled={query.isFetching}
        style={h.state} onPress={() => void paging.loadMore(true)}>
        {query.isFetchingNextPage ? <AppLoader color={theme.colors.accent} /> : <Text style={[h.link, { color: theme.colors.primary }]}>{query.isFetchNextPageError ? 'Could not load more. Tap to retry' : 'Show more'}</Text>}
      </Pressable> : null} />
    <ProfileDrawer visible={drawer} onClose={() => setDrawer(false)}
      onOpenFavorites={() => { setDrawer(false); navigation.navigate('ShopTabs', { screen: 'Favorites' }); }} />
    {search && <SearchPanel visible onClose={() => setSearch(false)} onOpenProduct={(id) => { setSearch(false); openProduct(id); }} />}
    <TopFeedbackToast feedback={home.feedback} />
  </SafeAreaView>;
}
