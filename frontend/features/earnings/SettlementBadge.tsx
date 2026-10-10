import { Text, View } from 'react-native';
import { Settlement, settlementNote, settlementOptions } from './settlement-model';
import { cash } from './payout-format';
import { ps as s } from './payout.styles';

export function SettlementBadge({ settlement, detail = false, admin = false }: {
  settlement: Settlement; detail?: boolean; admin?: boolean;
}) {
  const tone = settlementOptions.find((item) => item.key === settlement.state)!;
  return <View style={{ gap: 7 }}>
    <Text style={[s.badge, { alignSelf: 'flex-start', backgroundColor: tone.bg, color: tone.color }]}>{tone.label}</Text>
    {detail && <>
      <Text style={s.muted}>{settlementNote(settlement)}</Text>
      <Text style={s.text}>{admin ? 'Seller amount' : 'Your amount'}: {cash(settlement.netPaise)} · {settlement.state === 'cleared' ? 'Cleared' : settlement.state === 'refunded' ? 'Refunded' : 'Pending'}</Text>
      {admin && <Text style={s.text}>Commission: {cash(settlement.commissionPaise)} · {settlement.pendingCommissionPaise > 0 ? 'Pending' : 'Cleared'}</Text>}
      {!settlement.paymentVerified && settlement.state !== 'refunded' && <Text style={s.muted}>Customer payment not yet verified.</Text>}
    </>}
  </View>;
}
