import { useMemo } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { AppLoader } from '../../components/AppLoader';
import { useShopProducts } from '../../services/products/product-queries';
import { useAppTheme } from '../../theme/ThemeProvider';
import { money } from '../../utils/money';
import { searchStyles as s } from './search.styles';

// Mounted only for a settled, non-empty search on the visible screen.
export function SearchResults({ term, onOpenProduct }: { term: string; onOpenProduct: (id: string) => void }) {
  const theme = useAppTheme();
  const result = useShopProducts('All', term);
  const products = useMemo(() => {
    const seen = new Set<string>();
    return (result.data?.pages ?? []).flatMap((page) => page.products).filter((product) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id); return true;
    });
  }, [result.data]);
  const retry = <Pressable accessibilityRole="button" disabled={result.isFetching} onPress={() => void result.refetch()}>
    <Text accessibilityRole="alert" style={[s.infoText, { color: theme.colors.muted }]}>Could not search. Tap to retry.</Text>
  </Pressable>;
  return <FlatList data={products} keyExtractor={(product) => product.id} contentContainerStyle={s.results}
    keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
    initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7}
    ListHeaderComponent={result.isRefetchError && products.length > 0 ? retry : null}
    ListEmptyComponent={result.isPending ? <AppLoader accessibilityLabel="Searching products" color={theme.colors.primary} />
      : result.isError ? retry : <Text style={[s.infoText, { color: theme.colors.muted }]}>No matching products.</Text>}
    renderItem={({ item: product }) => <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}`}
      onPress={() => onOpenProduct(product.id)} style={[s.result, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {product.coverImage ? <Image source={{ uri: product.coverImage }} style={s.image} /> : <View style={[s.image, { backgroundColor: theme.colors.raised }]} />}
      <View style={s.resultText}><Text style={[s.infoTitle, { color: theme.colors.text }]}>{product.name}</Text>
        <Text style={[s.infoText, { color: theme.colors.muted }]}>{product.storeName} · {money(product.price)}</Text></View>
    </Pressable>}
    ListFooterComponent={result.isFetchingNextPage ? <AppLoader accessibilityLabel="Loading more search results" color={theme.colors.primary} />
      : result.hasNextPage ? <Pressable accessibilityRole="button" disabled={result.isFetching} onPress={() => {
        if (!result.isFetching) void result.fetchNextPage({ cancelRefetch: false });
      }}><Text style={[s.more, { color: theme.colors.primary }]}>{result.isFetchNextPageError ? 'Could not load more. Tap to retry.' : 'Load more'}</Text></Pressable> : null} />;
}
