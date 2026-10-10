import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StoreIcon } from '../user/store-registration/StoreIcon';
import { SellerTab } from './seller-types';

const items: { label: string; tab?: SellerTab; icon: 'wallet' | 'store' | 'document' | 'more' }[] = [
  { label: 'Home', tab: 'Home', icon: 'wallet' },
  { label: 'Products', tab: 'Products', icon: 'store' },
  { label: 'Orders', tab: 'Orders', icon: 'document' },
  { label: 'Earnings', tab: 'Earnings', icon: 'wallet' },
  { label: 'More', icon: 'more' },
];

export function SellerBottomNav({ selected, onSelect, onMore }: {
  selected: SellerTab; onSelect: (tab: SellerTab) => void; onMore: () => void;
}) {
  return <View accessibilityRole="tablist" style={s.bar}>
    {items.map((item) => {
      const active = item.tab === selected;
      return <Pressable key={item.label} accessibilityRole="tab" accessibilityState={{ selected: active }}
        accessibilityLabel={item.label} onPress={() => item.tab ? onSelect(item.tab) : onMore()} style={s.item}>
        <View style={[s.icon, active && s.activeIcon]}>
          {item.icon === 'more'
            ? <Text style={[s.more, active && s.activeText]}>•••</Text>
            : <StoreIcon name={item.icon} size={19} color={active ? '#6838F5' : '#8B8798'} />}
        </View>
        <Text style={[s.label, active && s.activeText]}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEEAF5',
    paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4, elevation: 12 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 54, gap: 3 },
  icon: { width: 34, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  activeIcon: { backgroundColor: '#F0EAFE' },
  label: { color: '#8B8798', fontSize: 10, fontWeight: '600' },
  activeText: { color: '#6838F5', fontWeight: '800' },
  more: { color: '#8B8798', letterSpacing: 2, fontSize: 14, fontWeight: '900' },
});
