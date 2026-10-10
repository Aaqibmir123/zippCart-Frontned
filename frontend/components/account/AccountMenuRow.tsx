import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
export type AccountPage = 'Profile' | 'Coupons' | 'Referral' | 'Your store' | 'Store requests' | 'Support' | 'App info';
export type MenuLabel = AccountPage | 'Favorites';
const icons: Record<MenuLabel, string> = {
  'Store requests': 'M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h3',
  Support: 'M4 13v-1a8 8 0 0 1 16 0v1M4 12H2v7h4v-7H4Zm16 0h2v7h-4v-7h2Zm0 7v2h-7',
  'App info': 'M12 8h.01M11 12h1v5m0-15a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
  Profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-2a8 8 0 0 1 16 0v2',
  Favorites: 'M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 5 3 11 8 15 5-4 12-10 8-15Z',
  Coupons: 'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Zm12 0v3m0 3v2m0 3v3',
  Referral: 'M16 11a3 3 0 1 0 0-6m1 10a5 5 0 0 1 4 5M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-2a6 6 0 0 1 12 0v2',
  'Your store': 'M3 10h18l-2-6H5l-2 6Zm2 0v11h14V10M9 21v-7h6v7',
};
export function AccountMenuRow({ label, onPress, unread = false, dark = false }: { label: MenuLabel; onPress: () => void; unread?: boolean; dark?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.row, pressed && s.pressed, dark && s.darkPressed]}>
    <View style={[s.icon, dark && s.darkIcon]}><Svg width={21} height={21} viewBox="0 0 24 24" fill="none"><Path d={icons[label]} stroke={dark ? '#D0B8F4' : '#8050A5'} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></Svg></View>
    <Text style={[s.label, dark && s.darkLabel]}>{label}</Text>{unread && <Text accessibilityLabel="Unread support updates" style={{ color: dark ? '#D0B8F4' : '#72508D' }}>●</Text>}<Text style={[s.arrow, dark && s.darkArrow]}>›</Text>
  </Pressable>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 11, paddingHorizontal: 14, minHeight: 62 }, pressed: { backgroundColor: '#F0EDF8', borderRadius: 14 }, darkPressed: { backgroundColor: '#383044' }, darkLabel: { color: '#F0EAF7' }, darkArrow: { color: '#B9AEC8' }, icon: { width: 38, height: 38, flexShrink: 0, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7EFFB' }, darkIcon: { backgroundColor: '#383044' }, label: { flex: 1, minWidth: 0, color: '#354159', fontSize: 14, fontWeight: '600' }, arrow: { color: '#ABAABB', fontSize: 23 } });
