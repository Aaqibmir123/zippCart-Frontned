import { Pressable, ScrollView, Text, View } from 'react-native';
import { HoldGroups, SettlementFilter, settlementOptions } from './settlement-model';
import { cash } from './payout-format';
import { ps as s } from './payout.styles';

export function SettlementFilters({ groups, selected, onSelect, seller = false }: { groups: HoldGroups; selected: SettlementFilter; onSelect: (value: SettlementFilter) => void; seller?: boolean }) {
  const options = [{ key: 'all' as const, label: 'All', color: '#425466', bg: '#EDF2F8' }, ...settlementOptions];
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
    {options.map((item) => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: item.key === selected }}
      onPress={() => onSelect(item.key)} style={[seller ? s.sellerCard : s.card,
        { backgroundColor: seller && selected === item.key ? '#F0EAFE' : item.bg,
          borderColor: seller ? (selected === item.key ? '#6838F5' : '#ECE8F2') : (selected === item.key ? item.color : item.bg), borderWidth: 2 }]}>
      <Text style={[seller ? s.sellerLink : s.link, !seller && { color: item.color }]}>
        {item.label} ({item.key === 'all' ? Object.values(groups).reduce((sum, group) => sum + group.orders, 0) : groups[item.key].orders})</Text>
    </Pressable>)}
  </ScrollView>;
}
export function HoldBreakdown({ groups, admin, seller = false }: { groups: HoldGroups; admin: boolean; seller?: boolean }) {
  const holds = settlementOptions.filter((item) => !['cleared', 'refunded'].includes(item.key) && groups[item.key].orders > 0);
  return <View style={seller ? s.sellerCard : s.card}>
    <Text style={s.heading}>Pending amounts</Text>
    {!holds.length && <Text style={seller ? s.sellerMuted : s.muted}>No amounts on hold.</Text>}
    {holds.map((item) => <View key={item.key} style={s.divider}>
      <View style={s.row}><Text style={[s.heading, { color: item.color }]}>{item.label} ({groups[item.key].orders})</Text>
        <Text style={s.heading}>{cash(groups[item.key].sellerPaise)}</Text></View>
      {admin && <Text style={seller ? s.sellerMuted : s.muted}>Collected: {cash(groups[item.key].collectedPaise)} · Pending commission: {cash(groups[item.key].commissionPaise)}</Text>}
    </View>)}
    <Text style={seller ? s.sellerMuted : s.muted}>Seller amounts stay out of payout until delivery, 24 hours, return checks and collection are complete.</Text>
  </View>;
}
