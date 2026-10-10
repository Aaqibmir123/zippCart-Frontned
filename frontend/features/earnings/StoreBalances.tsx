import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { StoreEarning } from './earnings-api';
import { Line } from './EarningsCards';
import { PayoutAccountCard } from './PayoutAccountCard';
import { cash } from './payout-format';
import { ps as s } from './payout.styles';

export function StoreBalances({ stores, admin, seller = false, selected, onSelect, onPay }: {
  stores: StoreEarning[]; admin: boolean; seller?: boolean; selected: string;
  onSelect: (id: string) => void; onPay?: (store: StoreEarning) => void;
}) {
  const [search, setSearch] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const [limit, setLimit] = useState(20);
  const filtered = stores.filter((store) => store.name.toLowerCase().includes(search.trim().toLowerCase())
    && (!dueOnly || store.availablePaise > 0));
  if (admin && !selected) return <>
    <Text style={s.heading}>Seller payouts</Text>
    <TextInput accessibilityLabel="Search seller" placeholder="Search store name" value={search}
      onChangeText={(text) => { setSearch(text); setLimit(20); }} style={s.input} />
    <View style={s.tabs}>{[false, true].map((due) => <Pressable key={String(due)} accessibilityRole="tab"
      accessibilityState={{ selected: dueOnly === due }} onPress={() => { setDueOnly(due); setLimit(20); }}
      style={[s.tab, dueOnly === due && s.active]}><Text style={s.link}>{due ? 'Ready to pay' : 'All sellers'}</Text></Pressable>)}</View>
    {!filtered.length && <Text style={s.muted}>No sellers match this filter.</Text>}
    {filtered.slice(0, limit).map((store) => <Pressable key={store.storeId} style={s.card}
      accessibilityRole="button" onPress={() => onSelect(store.storeId)}>
      <View style={s.row}><Text style={s.heading}>{store.name}</Text><Text style={s.link}>Details →</Text></View>
      <Line label="Ready to pay" value={store.availablePaise} />
      <Line label="On hold / upcoming" value={store.heldPaise} />
      <Text style={s.muted}>{store.availablePaise > 0 ? 'Ready to transfer' : store.heldPaise > 0 ? 'Pending delivery / return checks' : 'No payout due'} · {store.payoutMethod?.toUpperCase() ?? 'No account'}</Text>
    </Pressable>)}
    {filtered.length > limit && <Pressable style={s.touch} onPress={() => setLimit(limit + 20)}><Text style={s.link}>Show more sellers</Text></Pressable>}
  </>;
  return <>{stores.map((store) => <View key={store.storeId} style={{ gap: 16 }}>
    <View style={seller ? s.sellerCard : s.card}>
      <Text style={s.heading}>{store.name}</Text>
      <Line label="Total net (including pending)" value={store.lifetime.netPaise} seller={seller} />
      <Line label={admin ? 'Already paid' : 'Already received'} value={store.paidPaise} seller={seller} />
      <View style={seller ? s.sellerDivider : s.divider}><Line label={store.balancePaise < 0 ? 'Refund adjustment' : 'Remaining balance'} value={store.balancePaise} seller={seller} /></View>
      <Text style={seller ? s.sellerMuted : s.muted}>{store.availablePaise > 0 ? `${cash(store.availablePaise)} due now.` : 'No payout ready today.'} Held amounts release after payment verification and return checks.</Text>
      {admin && store.availablePaise > 0 && onPay && <Pressable style={s.button} onPress={() => onPay(store)}>
        <Text style={s.buttonText}>Record completed payout</Text>
      </Pressable>}
    </View>
    <PayoutAccountCard admin={admin} storeId={store.storeId} seller={seller} />
  </View>)}</>;
}
