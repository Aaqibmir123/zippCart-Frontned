import { SupportCaseScreen } from './SupportCaseScreen';
import { ReturnCaseDetails } from './ReturnCaseDetails';
import { CustomerReturnActions } from './CustomerReturnActions';
import { RefundPayoutCard } from './RefundPayoutCard';

export function CustomerCaseScreen(props: {
  orderId: string; caseId: string; onClose: () => void; initialTab?: 'details' | 'messages';
}) {
  return <SupportCaseScreen {...props} renderDetails={(record) => <>
    <ReturnCaseDetails record={record} />
    <RefundPayoutCard record={record} />
    <CustomerReturnActions key={record.id} record={record} />
  </>} />;
}
