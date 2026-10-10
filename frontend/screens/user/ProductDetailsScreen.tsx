import { BrandWordmark } from '../../components/brand/BrandWordmark';
import { AppLoader } from '../../components/AppLoader';
﻿import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ReactNode, useRef, useState } from 'react';
import { HomeIcon } from '../../features/home/HomeIcon';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ProductInformation } from '../../components/shop/product-details/ProductInformation';
import { ProductRecommendations } from '../../components/shop/product-details/ProductRecommendations';
import { ProductReviews } from '../../components/shop/product-details/ProductReviews';
import { productDetailsStyles as s } from './product-details.styles';
import { ProductGallery } from '../../components/shop/ProductGallery';
import { ProductPurchaseBar } from '../../components/shop/ProductPurchaseBar';
import { TopFeedbackToast } from '../../components/TopFeedbackToast';
import { useTimedFeedback } from '../../hooks/useTimedFeedback';
import { ShopStackParamList } from '../../navigation/user/shop-routes';
import { useShopProduct, useShopProductMedia, useShopProducts } from '../../services/products/product-queries';
import { useFavorites, useToggleFavorite } from '../../services/favorites/favorite-queries';
import { useAddCartItem, useCart } from '../../services/cart/cart-queries';
import { colors } from '../../theme';
import { money } from '../../utils/money';
import { availableStock, productQuantity, variantAvailableStock } from '../../services/products/stock';
import { useAppTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<ShopStackParamList, 'ProductDetails'>;

export function ProductDetailsScreen({ navigation, route }: Props) {
  const theme = useAppTheme();
  const query = useShopProduct(route.params.productId);
  const mediaQuery = useShopProductMedia(route.params.productId, !!query.data?.product);
  const relatedQuery = useShopProducts(query.data?.product.category ?? 'All', '', Boolean(query.data?.product));
  const [chosenColor, setChosenColor] = useState('');
  const [chosenSize, setChosenSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const scroll = useRef<ScrollView>(null);
  const sections = useRef<Record<string, number>>({});
  const { feedback, showFeedback } = useTimedFeedback();
  const cart = useCart();
  const add = useAddCartItem();
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const product = query.data?.product;

  if (query.isPending) return <SafeAreaView style={[s.center, { backgroundColor: theme.colors.background }]}><AppLoader variant="section" accessibilityLabel="Loading product" color={colors.primary} /></SafeAreaView>;
  if (!product) return <SafeAreaView style={[s.center, { backgroundColor: theme.colors.background }]}>
    <Text style={[s.description, { color: theme.colors.text }]}>This product is unavailable.</Text>
    <Pressable onPress={() => void query.refetch()}><Text style={[s.link, { color: theme.colors.primary }]}>Try again</Text></Pressable>
    <Pressable onPress={navigation.goBack}><Text style={[s.link, { color: theme.colors.primary }]}>Go back</Text></Pressable>
  </SafeAreaView>;

  const currentProduct = product;
  const selectedColor = product.colors.find((entry) => entry.name === chosenColor);
  const color = selectedColor?.name ?? '';
  const hasSelectableVariants = product.sizes.length > 0 || product.colors.length > 0;
  const missingColor = product.colors.length > 0 && !chosenColor;
  const missingSize = product.sizes.length > 0 && !chosenSize;
  const variantSelectionRequired = missingColor || missingSize;
  const selectionPrompt = missingColor && missingSize ? 'Choose size and color'
    : missingSize ? 'Choose a size' : missingColor ? 'Choose a color' : undefined;
  const stock = variantSelectionRequired ? availableStock(product.stock) : variantAvailableStock(product, color, chosenSize);
  const outOfStock = stock === 0;
  const storeClosed = product.storeOpen === false;
  const matchingCart = product.variantStock?.length ? (cart.data?.items ?? []).filter((item) => item.color === color && item.size === chosenSize) : cart.data?.items ?? [];
  const remaining = stock - productQuantity(matchingCart, product.id);
  const cartLimitReached = quantity > remaining;
  // General photos may show other variants. Keep each color's gallery isolated.
  const media = mediaQuery.data;
  const selectedColorMedia = media?.colors.find((entry) => entry.name === color);
  const images = [...new Set((selectedColor ? selectedColorMedia?.images ?? [] : media?.images ?? []).filter(Boolean))];
  if (!selectedColor && !images.length && product.coverImage) images.push(product.coverImage);
  const savedItems = cart.data?.items.filter((item) => item.productId === product.id) ?? [];
  const selectedVariantAdded = savedItems.some((item) => item.color === color && item.size === chosenSize);
  const isAdded = hasSelectableVariants ? selectedVariantAdded && !variantSelectionRequired : savedItems.length > 0;
  const cartStatus = savedItems.length ? `${selectedVariantAdded ? 'Already added to cart' : 'In your cart'} · ${savedItems.map((item) => [item.color, item.size].filter(Boolean).join(' / ') || 'Standard').join(', ')}` : undefined;
  const isFavorite = favorites.data?.favorites.some((entry) => entry.productId === product.id) ?? false;
  const discount = product.mrp > product.price ? Math.round((1 - product.price / product.mrp) * 100) : 0;

  async function addToCart() {
    if (storeClosed) { showFeedback('Store is currently closed. Ordering will resume when the store opens.', 'error'); return; }
    if (isAdded) { navigation.navigate('ShopTabs', { screen: 'Cart' }); return; }
    if (variantSelectionRequired) return;
    if (outOfStock || add.isPending || cart.isFetching) return;
    if (quantity > stock) { showFeedback('This quantity is no longer available.', 'error'); setQuantity(Math.max(1, stock)); return; }
    if (cart.isError) { showFeedback('Could not check your cart. Please try again.', 'error'); void cart.refetch(); return; }
    if (cartLimitReached) { showFeedback('Reduce the quantity. Some stock is already in your cart.', 'error'); return; }
    try {
      await add.mutateAsync({ productId: currentProduct.id, color, size: chosenSize, quantity });
      showFeedback('Added to cart', 'success');
    } catch (error) { showFeedback(error instanceof Error ? error.message : 'Could not add to cart.', 'error'); void query.refetch(); }
  }
  function buyNow() {
    if (storeClosed) { showFeedback('Store is currently closed. Ordering will resume when the store opens.', 'error'); return; }
    if (variantSelectionRequired) return;
    if (outOfStock || add.isPending) return;
    if (quantity > stock) { showFeedback('This quantity is no longer available.', 'error'); setQuantity(Math.max(1, stock)); return; }
    navigation.navigate('BuyNow', { productId: currentProduct.id, color, size: chosenSize,
      quantity, purchaseId: `${Date.now()}-${Math.random().toString(36).slice(2, 14)}` });
  }
  async function toggleFavorite() {
    try {
      await toggle.mutateAsync({ isFavorite, productId: currentProduct.id });
      showFeedback(isFavorite ? 'Removed from favorites' : 'Saved to favorites', 'success');
    } catch (error) { showFeedback(error instanceof Error ? error.message : 'Could not update favorites.', 'error'); }
  }
  return <SafeAreaView edges={['top', 'bottom']} style={[s.page, { backgroundColor: theme.colors.background }]}>
    <View style={[s.header, { backgroundColor: theme.colors.background }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={navigation.goBack} style={s.headerButton}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="m14 6-6 6 6 6M8 12h12" stroke={theme.colors.text} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <HomeIcon name="cart" color={theme.colors.primary} size={23} />
      <BrandWordmark style={[s.headerTitle, { color: theme.colors.text }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        accessibilityState={{ disabled: toggle.isPending, selected: isFavorite }} disabled={toggle.isPending}
        onPress={() => void toggleFavorite()} style={s.headerButton}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill={isFavorite ? '#C4607C' : 'none'}>
          <Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"
            stroke={isFavorite ? '#C4607C' : theme.colors.text} strokeWidth={1.6} strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open cart" onPress={() => navigation.navigate('ShopTabs', { screen: 'Cart' })} style={s.headerButton}>
        <HomeIcon name="cart" size={23} />
        {!!cart.data?.items.length && <View style={s.cartBadge}><Text style={s.cartCount}>{cart.data.items.length > 99 ? '99+' : cart.data.items.length}</Text></View>}
      </Pressable>
    </View>
    <ScrollView ref={scroll} style={{ backgroundColor: theme.colors.background }} contentContainerStyle={[s.content, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <ProductGallery key={`${product.id}-${color}`} images={images} name={product.name} discount={discount} />
      {mediaQuery.isError && <Pressable accessibilityRole="button" onPress={() => void mediaQuery.refetch()}><Text style={[s.link, { color: theme.colors.primary }]}>Product photos unavailable. Tap to retry.</Text></Pressable>}
      <View style={[s.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text accessibilityRole="header" style={[s.name, { color: theme.colors.text }]}>{product.name}</Text>
      <View style={s.identityRow}>
        <Text style={[s.brand, { color: theme.colors.muted }]}>{product.brand || product.category}</Text>
        <View style={s.stockBadge}>
          <View style={[s.stockDot, outOfStock && s.noStockDot]} />
          <Text style={[s.stockText, theme.isDark && !outOfStock && { color: '#61D49D' }, outOfStock && s.noStockText]}>
            {outOfStock ? 'Out of stock' : stock <= 5 ? `Only ${stock} left` : 'In stock'}
          </Text>
        </View>
      </View>
      <View style={s.priceRow}>
        <Text style={[s.price, { color: theme.colors.text }]}>{money(product.price)}</Text>
        {discount > 0 && <><Text style={[s.mrp, { color: theme.colors.muted }]}>{money(product.mrp)}</Text><Text style={s.discount}>{discount}% off</Text></>}
      </View>
      <Text style={[s.tax, { color: theme.colors.muted }]}>Inclusive of all taxes</Text>
      {storeClosed && <View style={[s.closedNotice, theme.isDark && { backgroundColor: '#392A25', borderColor: '#604338' }]}><Text style={[s.closedTitle, theme.isDark && { color: '#F0B99A' }]}>Store is currently closed</Text><Text style={[s.closedText, theme.isDark && { color: '#D0A88F' }]}>Ordering will resume when the store opens.</Text></View>}
      {discount > 0 && <View style={[s.savings, theme.isDark && { backgroundColor: theme.colors.raised }]}><HomeIcon name="tag" size={18} color={theme.colors.accent} /><Text style={[s.savingsText, { color: theme.colors.text }]}>You save {money(product.mrp - product.price)} on this product</Text></View>}
      </View>
      {!!product.colors.length && <Section dark={theme.isDark} title="Color" value={color || 'Select a color'}>
        <View style={s.options}>{product.colors.map((item) => <Pressable key={item.name}
          accessibilityRole="button" accessibilityLabel={`Color: ${item.name}`} accessibilityState={{ selected: color === item.name }}
          onPress={() => setChosenColor(item.name)} style={[s.colorOption, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, color === item.name && s.activeColorOption]}>
          <View style={[s.colorRing, color === item.name && s.activeRing]}>{media?.colors.find((entry) => entry.name === item.name)?.images[0] ? <Image source={{ uri: media.colors.find((entry) => entry.name === item.name)?.images[0] }} style={s.colorImage} /> : <View style={[s.colorImage, { backgroundColor: theme.colors.raised }]} />}</View>
          <Text style={[s.optionText, { color: theme.colors.text }, color === item.name && s.activeColorText]}>{item.name}</Text>
          {color === item.name && <View style={s.colorCheck}><Text style={s.colorCheckText}>{'\u2713'}</Text></View>}
        </Pressable>)}</View>
      </Section>}
      {!!product.sizes.length && <Section dark={theme.isDark} title="Size" value={chosenSize || 'Select a size'}>
        <View style={s.options}>{product.sizes.map((size) => <Pressable key={size}
          accessibilityRole="button" accessibilityLabel={`Size: ${size}`} accessibilityState={{ selected: chosenSize === size }}
          onPress={() => setChosenSize(size)} style={[s.option, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, chosenSize === size && s.selected]}>
          <Text style={[s.optionText, { color: theme.colors.text }, chosenSize === size && s.selectedText]}>{size}</Text>
        </Pressable>)}</View>
      </Section>}
      <View style={[s.quantityRow, theme.isDark && { backgroundColor: theme.colors.raised }]}><Text style={[s.sectionTitle, { color: theme.colors.text }]}>Quantity</Text><View style={[s.stepper, theme.isDark && { borderColor: theme.colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" accessibilityState={{ disabled: quantity <= 1 }} disabled={quantity <= 1} onPress={() => setQuantity(quantity - 1)} style={[s.step, theme.isDark && { backgroundColor: theme.colors.surface }, quantity <= 1 && s.disabled]}><Text style={[s.stepText, { color: theme.colors.text }]}>−</Text></Pressable>
        <Text accessibilityLiveRegion="polite" style={[s.quantity, { color: theme.colors.text }]}>{quantity}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" accessibilityState={{ disabled: quantity >= Math.min(stock, 99) }} disabled={quantity >= Math.min(stock, 99)} onPress={() => setQuantity(quantity + 1)} style={[s.step, theme.isDark && { backgroundColor: theme.colors.surface }, quantity >= Math.min(stock, 99) && s.disabled]}><Text style={[s.stepText, { color: theme.colors.text }]}>+</Text></Pressable>
      </View></View>
      <View style={[s.delivery, theme.isDark && { backgroundColor: '#23372F', borderColor: '#355548' }]}><HomeIcon name="orders" color={theme.colors.primary} /><View style={{ flex: 1 }}><Text style={[s.deliveryTitle, { color: theme.colors.text }]}>Delivery to your doorstep</Text><Text style={[s.deliveryText, { color: theme.colors.muted }]}>Choose your address and view delivery charges at checkout.</Text></View></View>
      <View style={[s.tabs, theme.isDark && { backgroundColor: theme.colors.raised }]}>{['Details', 'Reviews', 'Similar'].map((label) => <Pressable key={label} accessibilityRole="button" onPress={() => scroll.current?.scrollTo({ y: sections.current[label] ?? 0, animated: true })} style={s.tab}><Text style={[s.tabText, { color: theme.colors.primary }]}>{label}</Text></Pressable>)}</View>
      <View onLayout={(event) => { sections.current.Details = event.nativeEvent.layout.y; }}><ProductInformation product={product} /></View>
      <View onLayout={(event) => { sections.current.Reviews = event.nativeEvent.layout.y; }}><ProductReviews productId={product.id} /></View>
      <View onLayout={(event) => { sections.current.Similar = event.nativeEvent.layout.y; }}>
      {relatedQuery.isPending && <AppLoader accessibilityLabel="Loading similar products" color={theme.colors.primary} style={{ margin: 20 }} />}
      {relatedQuery.isError && <Pressable onPress={() => void relatedQuery.refetch()}><Text style={[s.link, { color: theme.colors.primary }]}>Could not load similar products. Tap to retry.</Text></Pressable>}
      <ProductRecommendations products={(relatedQuery.data?.pages.flatMap((page) => page.products) ?? []).filter((item) => item.id !== product.id)}
        onOpen={(id) => navigation.push('ProductDetails', { productId: id })} />
      </View>
    </ScrollView>
    <ProductPurchaseBar isAdded={isAdded} isPending={add.isPending} outOfStock={outOfStock} storeClosed={storeClosed}
      cartStatus={cartStatus}
      selectionPrompt={selectionPrompt}
      variantSelectionRequired={variantSelectionRequired}
      cartLimitReached={!isAdded && cartLimitReached} cartLoading={cart.isPending || cart.isFetching}
      onAddToCart={() => void addToCart()} onBuyNow={buyNow} />
    <TopFeedbackToast feedback={feedback} />
  </SafeAreaView>;
}

function Section({ title, value, children, dark = false }: { title: string; value: string; children: ReactNode; dark?: boolean }) {
  return <View style={[s.section, dark && { backgroundColor: '#211D2A', borderColor: '#40364E' }]}>
    <View style={s.sectionHeader}><Text style={[s.sectionTitle, dark && { color: '#F6F0FC' }]}>{title}</Text><Text style={[s.sectionValue, dark && { color: '#B9AEC8' }]}>{value}</Text></View>
    {children}
  </View>;
}
