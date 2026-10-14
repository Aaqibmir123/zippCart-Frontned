import { AppLoader } from '../../components/AppLoader';
import { memo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { ShopProduct } from '../../services/api/product-api';
import { money } from '../../utils/money';
import { HomeIcon } from './HomeIcon';
import { h } from './home.styles';
import { useAppTheme } from '../../theme/ThemeProvider';

export const HomeProductCard = memo(function HomeProductCard({ product, width, favorite, favoritePending, favoriteDisabled = false, onOpen, onFavorite, onAdd }: {
  product: ShopProduct; width: number; favorite: boolean; favoritePending: boolean; favoriteDisabled?: boolean;
  onOpen: (id: string) => void; onFavorite: (id: string) => void; onAdd: (id: string) => void;
}) {
  const theme = useAppTheme();
  const discount = product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;
  const availability = [product.stock < 1 && 'Out of stock', product.storeOpen === false && 'Store closed'].filter(Boolean).join(' · ');
  return <View style={[h.card, { width, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}`} onPress={() => onOpen(product.id)}>
      <View style={[h.productVisual, { backgroundColor: theme.colors.raised }]}>{product.coverImage
        ? <Image source={{ uri: product.coverImage }} style={h.productImage} resizeMode="cover" />
        : <HomeIcon name="cart" size={35} color={theme.colors.muted} />}
        {discount > 0 && <Text style={h.badge}>{discount}% OFF</Text>}
      </View>
      <View style={h.productInfo}><Text numberOfLines={1} style={[h.productName, { color: theme.colors.text }]}>{product.name}</Text>
        <Text numberOfLines={1} style={[h.productMeta, { color: theme.colors.muted }]}>{product.brand || product.storeName || product.category}</Text></View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={favoriteDisabled ? `Wishlist not ready for ${product.name}` : `${favorite ? 'Remove' : 'Save'} ${product.name} ${favorite ? 'from' : 'to'} wishlist`}
      accessibilityState={{ disabled: favoriteDisabled || favoritePending, busy: favoritePending, selected: favorite }} disabled={favoriteDisabled || favoritePending} onPress={() => onFavorite(product.id)} style={[h.favorite, favoriteDisabled && h.disabled, theme.isDark && { backgroundColor: `${theme.colors.surface}E8` }]}>
      {favoritePending ? <AppLoader size={20} color={theme.colors.accent} accessibilityLabel="Updating wishlist" />
        : <HomeIcon name="heart" size={21} color={favorite ? theme.colors.accent : theme.colors.muted} filled={favorite} />}
    </Pressable>
    <View style={[h.priceRow, { paddingHorizontal: 5 }]}>
      <View style={h.prices}><Text style={[h.price, { color: theme.colors.text }]}>{money(product.price)}</Text>{discount > 0 && <Text style={[h.mrp, { color: theme.colors.muted }]}>{money(product.mrp)}</Text>}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={`View details for ${product.name}`}
        onPress={() => onAdd(product.id)} style={({ pressed }) => [h.add, { backgroundColor: theme.colors.raised, borderColor: theme.colors.border }, pressed && h.addPressed]}>
        <Text style={[h.addText, { color: theme.colors.primary }]}>View</Text>
      </Pressable>
    </View>
    {!!availability && <Text style={[h.productMeta, { padding: 5, color: theme.colors.text }]}>{availability}</Text>}
  </View>;
});
