import { View } from 'react-native';
import { AdminReturnsScreen } from './AdminReturnsScreen';
import { useAdminReturnCases } from '../../returns/return-api';
import { SupportInbox } from '../../returns/SupportInbox';
import { SupportTabs } from '../../returns/SupportTabs';
import { supportStyles as s } from '../../returns/support.styles';

export type SupportInboxTab = 'active' | 'history' | 'earlier';
export function ReturnWorkspace({ onOpen, tab, onTabChange }: {
  onOpen: (item: { orderId: string; caseId: string }) => void;
  tab: SupportInboxTab; onTabChange: (tab: SupportInboxTab) => void;
}) {
  const query = useAdminReturnCases(tab === 'history' ? 'closed' : 'open', tab !== 'earlier');
  return <View style={s.page}>
    <SupportTabs value={tab} onChange={onTabChange} items={[
      { value: 'active', label: 'Active' }, { value: 'history', label: 'History' }, { value: 'earlier', label: 'Earlier requests' },
    ]} />
    {tab === 'earlier' ? <AdminReturnsScreen /> : <SupportInbox query={query} admin history={tab === 'history'}
      onOpen={(item) => onOpen({ orderId: item.orderId, caseId: item.id })} />}
  </View>;
}
