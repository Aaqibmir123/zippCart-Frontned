import { BrandWordmark } from '../brand/BrandWordmark';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HomeIcon } from '../../features/home/HomeIcon';
import { useAppTheme } from '../../theme/ThemeProvider';

export function ShoppingTabHeader({ title, subtitle, action, onAction, disabled = false }: {
  title: string; subtitle: string; action: 'cart' | 'heart'; onAction: () => void; disabled?: boolean;
}) {
  const theme = useAppTheme();
  return <View style={[s.header, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    <View style={s.top}><View><BrandWordmark style={[s.brand, theme.isDark && { color: theme.colors.text }]} /><Text style={[s.tagline, theme.isDark && { color: theme.colors.muted }]}>Shop Local. Live Better.</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={action === 'cart' ? 'Open cart' : 'Open wishlist'} disabled={disabled} onPress={onAction} style={[s.action, theme.isDark && { backgroundColor: theme.colors.raised }, disabled && { opacity: 0.4 }]}><HomeIcon name={action} color={theme.isDark ? theme.colors.text : '#332052'} size={23} /></Pressable>
    </View>
    <View style={s.bottom}><View style={s.copy}><Text accessibilityRole="header" style={[s.title, theme.isDark && { color: theme.colors.text }]}>{title}</Text><Text style={[s.subtitle, theme.isDark && { color: theme.colors.muted }]}>{subtitle}</Text></View>
      <View style={[s.note, theme.isDark && { backgroundColor: theme.colors.raised }]}><HomeIcon name={action === 'cart' ? 'heart' : 'orders'} color="#EF3484" size={17} filled={action === 'cart'} /><Text style={[s.noteText, theme.isDark && { color: theme.colors.muted }]}>{action === 'cart' ? 'Good choices\nbrighten days!' : 'Your next\nfavorite finds'}</Text></View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingTop: 9, paddingBottom: 17, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#F0EAF4' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { color: '#39206C', fontSize: 27, fontWeight: '900', letterSpacing: -1.3 }, pink: { color: '#F31782' },
  tagline: { color: '#858090', fontSize: 9, fontWeight: '600', marginTop: 1 }, action: { width: 44, height: 44, backgroundColor: '#F8F4FC', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 20 }, copy: { flex: 1 }, title: { color: '#25213E', fontSize: 26, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { color: '#92899E', fontSize: 12, marginTop: 3 }, note: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFF0F6', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 10 }, noteText: { color: '#866478', fontSize: 9, lineHeight: 13, fontWeight: '600' },
});
