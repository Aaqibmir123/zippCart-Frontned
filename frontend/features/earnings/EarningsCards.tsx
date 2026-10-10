import { Pressable, Text, View } from 'react-native';
import { Statement, useEarnings } from './earnings-api';
import { ps as s } from './payout.styles';
import { cash } from './payout-format';
import { releaseLabel } from './settlement-model';
export { cash } from './payout-format';

export function EarningsShortcut({ admin = false, onPress }: { admin?: boolean; onPress: () => void }) {
  const query = useEarnings(admin);
  return <Pressable onPress={onPress} style={s.hero} accessibilityRole="button">
    <Text style={s.heroLabel}>{admin ? 'Cleared commission this month' : 'Cleared earnings this month'}</Text>
    <Text style={s.heroValue}>{query.data ? cash(admin ? query.data.totals.clearedCommissionPaise : query.data.totals.eligiblePaise) : '—'}</Text>
    <Text style={s.heroText}>{query.isError ? 'Could not load. Tap to retry.' : 'View payouts →'}</Text>
  </Pressable>;
}
export function EarningsCards({ data, admin, seller = false }: { data: Statement; admin: boolean; seller?: boolean }) {
  const held = data.stores.reduce((sum, store) => sum + store.heldPaise, 0);
  const style = seller
    ? { hero: s.sellerHero, heroLabel: s.sellerHeroLabel, heroValue: s.sellerHeroValue, heroText: s.sellerHeroText,
      grid: s.sellerGrid, tile: s.sellerTile, muted: s.sellerMuted }
    : { hero: s.hero, heroLabel: s.heroLabel, heroValue: s.heroValue, heroText: s.heroText,
      grid: s.grid, tile: s.tile, muted: s.muted };
  return <>
    <View style={style.hero}>
      <Text style={style.heroLabel}>{admin ? 'Ready to pay sellers' : 'Ready for payout'}</Text>
      <Text style={style.heroValue}>{cash(data.payablePaise)}</Text>
      <Text style={style.heroText}>Clears 24 hours after customer receipt, once returns and collection are resolved.</Text>
      {data.nextReleaseAt && <Text style={style.heroText}>Next window ends: {releaseLabel(data.nextReleaseAt)}</Text>}
    </View>
    <View style={style.grid}>
      <Metric label="On hold / upcoming" value={held} seller={seller} />
      <Metric label={admin ? 'Total paid to sellers' : 'Total received'} value={data.paidPaise} seller={seller} />
      {admin && <>      <Metric label="Cleared commission" value={data.holds.cleared.commissionPaise} seller={seller} />
      <Metric label="Pending commission" value={Object.entries(data.holds).reduce((sum, [key, group]) => sum + (key === 'cleared' ? 0 : group.commissionPaise), 0)} seller={seller} />
      <Metric label="Verified collections (net refunds)" value={Object.values(data.holds).reduce((sum, group) => sum + group.collectedPaise, 0)} seller={seller} /></>}
    </View>
  </>;
}
export function PeriodSummary({ data, admin, seller = false }: { data: Statement; admin: boolean; seller?: boolean }) {
  const card = seller ? s.sellerCard : s.card;
  const muted = seller ? s.sellerMuted : s.muted;
  return <View style={card}>
    <Text style={s.heading}>Selected {data.period}</Text>
    <Line label="Order item sales" value={data.totals.grossPaise} seller={seller} />
    <Line label="Refunds" value={-data.totals.refundPaise} seller={seller} />
    {admin && <><Line label="Verified collection (after refunds)" value={data.collectedPaise} seller={seller} />
      <Line label="Collection pending (after refunds)" value={data.uncollectedPaise} seller={seller} /></>}
    <Line label={admin ? 'Calculated commission' : 'Commission deducted'} value={admin ? data.totals.commissionPaise : -data.totals.commissionPaise} seller={seller} />
    {admin && <><Line label="Cleared commission" value={data.totals.clearedCommissionPaise} />
      <Line label="Pending commission" value={data.totals.pendingCommissionPaise} /></>}
    <View style={seller ? s.sellerDivider : s.divider}><Line label={admin ? 'Seller earnings' : 'Your earnings'} value={data.totals.netPaise} seller={seller} /></View>
    <Text style={muted}>{admin ? 'Item amounts only; delivery charges excluded.' : 'Commission is already deducted. No separate payment is due.'}</Text>
    <Text style={muted}>Includes pending amounts. Received orders use delivery date; undelivered orders use purchase date.</Text>
  </View>;
}
export function Metric({ label, value, seller = false }: { label: string; value: number; seller?: boolean }) {
  return <View style={seller ? s.sellerTile : s.tile}>
    <Text style={seller ? s.sellerMuted : s.muted}>{label}</Text><Text style={seller ? s.sellerValue : s.value}>{cash(value)}</Text></View>;
}
export function Line({ label, value, seller = false }: { label: string; value: number; seller?: boolean }) {
  return <View style={s.row}><Text style={[seller ? s.sellerMuted : s.text, { flex: 1 }]}>{label}</Text>
    <Text style={seller ? s.sellerAmount : s.heading}>{cash(value)}</Text></View>;
}
