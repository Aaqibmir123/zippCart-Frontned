import { Text, View } from 'react-native';
import { money } from '../../utils/money';
import { ReturnCase, reasonLabels, statusLabels } from './return-types';
import { addressText } from './PickupAddressEditor';
import { ReturnPhotos } from './ReturnPhotos';
import { rs as s } from './return.styles';

export const returnDate = (date: string) => new Date(date).toLocaleString('en-IN');
export function ReturnCaseDetails({ record }: { record: ReturnCase }) {
  return <>
    <View style={s.card}><Text selectable style={s.heading}>{record.requestId}</Text><Text style={s.badge}>{statusLabels[record.status]}</Text>
      <Text style={s.text}>{record.preference === 'refund' ? 'Refund' : 'Exchange'} · {money(record.amount)}</Text>
      {record.items.map((item) => <View key={item.index}><Text style={s.text}>{item.name} × {item.quantity}</Text>
        <Text style={s.muted}>{[item.color, item.size].filter(Boolean).join(' / ')}</Text>
        {record.preference === 'exchange' && <Text style={s.muted}>Replacement: {[item.exchangeColor, item.exchangeSize].filter(Boolean).join(' / ') || 'Same product'}</Text>}
      </View>)}
      <Text style={s.text}>{reasonLabels[record.reason]}</Text><Text style={s.muted}>{record.description}</Text>
      <ReturnPhotos orderId={record.orderId} ids={record.photoIds} />
      {!!record.refundMethod && <Text style={s.muted}>Refund method: {record.refundMethod.toUpperCase()}</Text>}
      {!!record.reference && <Text selectable style={s.text}>Refund reference: {record.reference}</Text>}
      {!!record.proofDueAt && <Text style={s.text}>Requested response by {returnDate(record.proofDueAt)}</Text>}
    </View>
    <View style={s.card}><Text style={s.heading}>Pickup address</Text>
      <Text style={s.text}>{record.pickupAddress.name} · {record.pickupAddress.phone}</Text>
      <Text style={s.text}>{addressText(record.pickupAddress)}</Text>
      {record.addressChangeRequested && <Text style={s.badge}>Reschedule / address change awaiting confirmation</Text>}
      {record.proposedAddress && <Text style={s.text}>Requested address: {addressText(record.proposedAddress)}</Text>}
      {record.pickup && <>
        <Text style={s.heading}>{record.pickup.mode === 'pickup' ? 'Pickup' : 'Drop-off'} arrangement</Text>
        <Text style={s.text}>{returnDate(record.pickup.start)} – {returnDate(record.pickup.end)}</Text>
        <Text style={s.text}>Contact: {record.pickup.contact}</Text><Text selectable style={s.muted}>Reference: {record.pickup.reference}</Text>
        <Text style={s.text}>{record.pickup.instructions}</Text>
      </>}
      {record.replacement && <><Text style={s.heading}>Replacement shipment</Text>
        <Text style={s.text}>{record.replacement.carrier}</Text><Text selectable style={s.text}>{record.replacement.reference}</Text></>}
    </View>
  </>;
}
