import { Text, View } from 'react-native';
import { SupportCaseScreen } from '../../returns/SupportCaseScreen';
import { ReturnCaseDetails } from '../../returns/ReturnCaseDetails';
import { RefundPayoutCard } from '../../returns/RefundPayoutCard';
import { AdminCaseActions } from './AdminCaseActions';
import { rs as s } from '../../returns/return.styles';

export function AdminCaseDetail(props: { orderId: string; caseId: string; onClose: () => void }) {
  return <SupportCaseScreen {...props} admin renderDetails={(record) => <>
    <AdminCaseActions key={record.id} record={record} />
    {record.inventory && <View style={s.card}>
      <Text style={s.heading}>Inventory</Text>
      {record.inventory.replacement && <Text style={s.text}>{
        { reserved: 'Replacement stock reserved', released: 'Replacement stock released', dispatched: 'Reserved replacement dispatched' }[record.inventory.replacement]
      }</Text>}
      {record.inventory.inspectedAt && record.items.map((item) => <Text key={item.index} style={s.muted}>
        {item.name} · {[item.color, item.size].filter(Boolean).join(' / ')}: {record.inventory?.restockItems.find((entry) => entry.index === item.index)?.quantity ?? 0} of {item.quantity} returned to sellable stock
      </Text>)}
    </View>}
    <RefundPayoutCard key={record.id + '-' + record.version} record={record} admin />
    <ReturnCaseDetails record={record} />
  </>} />;
}
