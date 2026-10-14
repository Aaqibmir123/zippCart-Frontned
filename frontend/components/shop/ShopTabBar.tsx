import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabActions, useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileDrawer } from '../ProfileDrawer';
import { HomeIcon } from '../../features/home/HomeIcon';
import { useAppTheme } from '../../theme/ThemeProvider';

const items = [
  { label: 'Home', icon: 'home', view: 'home' },
  { label: 'Orders', icon: 'orders', view: 'orders' },
  { label: 'Wishlist', icon: 'heart', view: 'wishlist' },
  { label: 'Account', icon: 'account', view: 'account' },
] as const;

export function ShopTabBar({ navigation, state }: BottomTabBarProps) {
  const { bottom, left, right } = useSafeAreaInsets();
  const theme = useAppTheme();
  const [accountOpen, setAccountOpen] = useState(false);
  const screenFocused = useIsFocused();
  const current = state.routes[state.index];
  useEffect(() => { setAccountOpen(false); }, [current.key, screenFocused]);
  const currentView = current.name === 'Home' ? 'home' : current.name === 'Orders' ? 'orders' : current.name === 'Favorites' ? 'wishlist' : current.name === 'Account' ? 'account' : '';
  return <>
    <View accessibilityRole="tablist" style={[s.bar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border,
      paddingBottom: Math.max(bottom, 10), paddingLeft: Math.max(left, 8), paddingRight: Math.max(right, 8) }]}>
      {items.map((item) => {
        const focused = accountOpen ? item.view === 'account'
          : currentView === item.view;
        return <Pressable key={item.view} accessibilityRole="tab" accessibilityLabel={item.label}
          accessibilityState={{ selected: focused }} style={({ pressed }) => [s.tab, pressed && s.pressed]}
          onPress={() => {
            if (item.view === 'account') {
              const route = state.routes.find((entry) => entry.name === 'Account');
              if (!route || current.name === 'Account') return;
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!event.defaultPrevented) setAccountOpen(true);
              return;
            }
            if (item.view === 'wishlist') {
              const route = state.routes.find((entry) => entry.name === 'Favorites');
              if (!route) return;
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!event.defaultPrevented) { setAccountOpen(false); navigation.dispatch(TabActions.jumpTo('Favorites')); }
              return;
            }
            const destination = item.view === 'orders' ? 'Orders' : 'Home';
            const route = state.routes.find((entry) => entry.name === destination);
            if (!route) return;
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!event.defaultPrevented) {
              setAccountOpen(false);
              navigation.dispatch(TabActions.jumpTo(destination,
                destination === 'Home' ? { ...route.params, view: 'home' } : undefined));
            }
          }}>
          <View style={[s.icon, focused && { backgroundColor: theme.isDark ? theme.colors.raised : '#FCE7F2' }]}><HomeIcon name={item.icon} size={25} color={focused ? theme.colors.accent : theme.colors.muted} filled={focused && item.view === 'home'} /></View>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[s.label, { color: theme.colors.muted }, focused && [s.active, { color: theme.colors.accent }]]}>{item.label}</Text>
        </Pressable>;
      })}
    </View>
    <ProfileDrawer visible={screenFocused && accountOpen && current.name !== 'Account'} onClose={() => setAccountOpen(false)}
      onOpenFavorites={() => { setAccountOpen(false); navigation.dispatch(TabActions.jumpTo('Favorites')); }} />
  </>;
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', flexShrink: 0, backgroundColor: '#FFFFFF', paddingTop: 8,
    borderTopWidth: 1, borderColor: '#EEE7F3', shadowColor: '#39215D',
    shadowOffset: { width: 0, height: -3 }, shadowRadius: 12, shadowOpacity: 0.05, elevation: 6 },
  tab: { flexGrow: 1, flexBasis: 0, minWidth: 0, minHeight: 60, paddingHorizontal: 3,
    paddingVertical: 3, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16 },
  icon: { width: 48, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  selectedIcon: { backgroundColor: '#FCE7F2' },
  pressed: { backgroundColor: '#FAF5FD' },
  label: { color: '#787186', fontSize: 11, fontWeight: '500', width: '100%', textAlign: 'center' },
  active: { color: '#C82568', fontWeight: '700' },
});
