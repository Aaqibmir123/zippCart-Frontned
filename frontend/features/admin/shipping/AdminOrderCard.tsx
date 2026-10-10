import { Pressable, Text, View } from 'react-native';
import { ReadyOrder } from './admin-shipping-api';
import { OperationsBadges } from '../../orders/OperationsBadges';
import { operationsTone } from '../../orders/operations-model';
import { SettlementBadge } from '../../earnings/SettlementBadge';
import { money } from '../../../utils/money';
import { ds as s } from '../dashboard/dashboard.styles';

export function AdminOrderCard({ order, number, onOpen }: { order: ReadyOrder; number: number; onOpen: () => void }) {
  const tone = operationsTone(order.operations);
  return <Pressable accessibilityRole="button" onPress={onOpen}
    style={[s.card, { borderLeftWidth: 4, borderLeftColor: tone.color, backgroundColor: tone.bg }]}>
    <View style={s.between}><View style={s.row}><Text style={[s.rank, { color: tone.color, backgroundColor: '#FFF' }]}>{number}</Text>
      <Text style={s.heading}>#{order.id.slice(-8).toUpperCase()}</Text></View></View>
    <OperationsBadges value={order.operations} />
    <Text style={s.heading}>{order.customerName || 'Customer order'}</Text>
    {!!order.storeNames?.length && <Text style={s.text}>{order.storeNames.join(' · ')}</Text>}
    <View style={s.between}><Text style={s.text}>{order.itemCount} items · {order.paymentMethod.toUpperCase()}</Text><Text style={s.heading}>{money(order.total)}</Text></View>
    <Text style={s.muted}>{new Date(order.createdAt).toLocaleDateString('en-IN')} · {order.label ? 'Label ready' : 'Label pending'}</Text>
    {order.settlements.filter((item, index, rows) => rows.findIndex((other) => other.state === item.state) === index)
      .map((settlement) => <SettlementBadge key={settlement.state} settlement={settlement} />)}
    <Text style={s.link}>View order details →</Text>
  </Pressable>;
}
