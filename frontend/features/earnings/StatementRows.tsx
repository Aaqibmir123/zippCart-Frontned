import { Pressable, Text, View } from 'react-native';
import { Statement } from './earnings-api';
import { Line } from './EarningsCards';
import { cash, dateLabel } from './payout-format';
import { ps as s } from './payout.styles';
import { SettlementBadge } from './SettlementBadge';

export function PayoutHistory({ data, admin, seller = false }: { data: Statement; admin: boolean; seller?: boolean }) {
  const card = seller ? s.sellerCard : s.card;
  const muted = seller ? s.sellerMuted : s.muted;
  return <>
    <View style={card}><Line label="Paid in selected period" value={data.periodPaidPaise} seller={seller} /></View>
    {!data.payoutCount && <Text style={muted}>No payouts in this period.</Text>}
    {data.payouts.map((payout) => <View key={payout.id} style={card}>
      <View style={s.row}><Text style={seller ? s.sellerValue : s.value}>{cash(payout.amountPaise)}</Text><Text style={s.badge}>Paid</Text></View>
      {admin && <Text style={s.heading}>{data.stores.find((store) => store.storeId === payout.storeId)?.name}</Text>}
      <Text style={s.text}>{payout.method.toUpperCase()} · {dateLabel(payout.createdAt)}</Text>
      <Text selectable style={muted}>Reference: {payout.reference}</Text>
    </View>)}
  </>;
}
export function OrderEarnings({ data, admin, seller = false, onCollect }: {
  data: Statement; admin: boolean; seller?: boolean; onCollect?: (orderId: string) => void;
}) {
  const card = seller ? s.sellerCard : s.card;
  const muted = seller ? s.sellerMuted : s.muted;
  return <>
    {!data.orderCount && <Text style={muted}>No orders match this period and status.</Text>}
    {data.orders.map((order) => <View key={`${order.orderId}:${order.storeId}`} style={card}>
      <View style={s.row}><Text style={s.heading}>#{order.orderId.slice(-8).toUpperCase()}</Text><Text style={muted}>{dateLabel((order.receivedAt ?? order.createdAt)!)}</Text></View>
      {admin && <Text style={s.text}>{data.stores.find((store) => store.storeId === order.storeId)?.name}</Text>}
      {order.items.map((item, index) => <Line key={index} label={`${item.name} × ${item.quantity}`} value={item.amountPaise} seller={seller} />)}
      {order.refundPaise > 0 && <Line label="Refunds" value={-order.refundPaise} seller={seller} />}
      <Line label={`Commission (${order.commissionBps / 100}%)`} value={-order.commissionPaise} seller={seller} />
      <View style={seller ? s.sellerDivider : s.divider}><Line label={admin ? 'Seller earnings' : 'Your earnings'} value={order.netPaise} seller={seller} /></View>
      <SettlementBadge settlement={order} detail admin={admin} />
      {admin && !!order.receivedAt && !order.paymentVerified && onCollect && <Pressable style={s.touch} onPress={() => onCollect(order.orderId)}>
        <Text style={s.link}>Verify collected payment</Text>
      </Pressable>}
    </View>)}
  </>;
}
