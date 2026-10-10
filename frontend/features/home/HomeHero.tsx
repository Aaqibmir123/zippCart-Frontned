import { BrandWordmark } from '../../components/brand/BrandWordmark';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { ProfileAvatar } from '../../components/account/ProfileAvatar';
import { useCart } from '../../services/cart/cart-queries';
import { HomeBanner } from './HomeBanner';
import { HomeIcon } from './HomeIcon';
import { h, palette } from './home.styles';
import { useAppTheme } from '../../theme/ThemeProvider';

export function HomeHero({ onSearch, onProfile, onShop, onCart, onNotifications }: {
  onSearch: () => void; onProfile: () => void; onShop: () => void; onCart: () => void; onNotifications: () => void;
}) {
  const { user } = useAuth();
  const cart = useCart();
  const theme = useAppTheme();
  const count = cart.data?.items.length ?? 0;
  return <LinearGradient colors={theme.isDark ? [theme.colors.background, theme.colors.surface, theme.colors.background] : ['#FFFFFF', '#FCF8FF', '#FFFFFF']} style={h.hero}>
    <View style={h.brandRow}>
      <View style={h.brand}>
        <BrandWordmark style={[h.brandName, { color: theme.colors.text }]} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="View notifications" onPress={onNotifications} style={[h.iconButton, { backgroundColor: theme.colors.raised }]}><HomeIcon name="bell" color={theme.colors.text} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open account" onPress={onProfile}><ProfileAvatar size={40} uri={user?.profileImage} /></Pressable>
    </View>
    <View style={h.brandRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Search products" onPress={onSearch} style={[h.search, { flex: 1, backgroundColor: theme.colors.surface }]}>
        <HomeIcon name="search" size={21} color={theme.colors.muted} /><Text numberOfLines={1} style={[h.searchText, { color: theme.colors.muted }]}>Search products</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open cart, ${count} items`} onPress={onCart} style={[h.iconButton, { backgroundColor: theme.colors.raised }]}>
        <HomeIcon name="cart" color={palette.pink} />
        {count > 0 && <View style={h.badgeCount}><Text style={h.count}>{count > 99 ? '99+' : count}</Text></View>}
      </Pressable>
    </View>
    <HomeBanner onShop={onShop} />
  </LinearGradient>;
}
