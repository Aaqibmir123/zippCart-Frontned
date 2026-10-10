import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SupportPanel } from '../../components/account/SupportPanel';
import { useReturnInbox } from './return-api';
import { CustomerCaseScreen } from './CustomerCaseScreen';
import { SupportInbox } from './SupportInbox';
import { SupportTabs } from './SupportTabs';
import { supportStyles as s } from './support.styles';

export function ReturnSupportHub({ onClose, onBackChange }: {
  onClose: () => void; onBackChange?: (handler: (() => void) | null) => void;
}) {
  const [tab, setTab] = useState<'active' | 'history' | 'contact'>('active');
  const [selected, setSelected] = useState<{ orderId: string; caseId: string } | null>(null);
  const query = useReturnInbox(tab === 'history' ? 'closed' : 'open', !selected && tab !== 'contact');
  useEffect(() => {
    onBackChange?.(selected ? () => setSelected(null) : onClose);
    return () => onBackChange?.(null);
  }, [selected, onClose, onBackChange]);
  if (selected) return <CustomerCaseScreen {...selected} onClose={() => setSelected(null)} />;
  return <View style={s.page}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to account" onPress={onClose} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
      <View style={s.flex}><Text style={s.title}>Support</Text><Text style={s.subtitle}>How can we help you?</Text></View>
    </View>
    <SupportTabs value={tab} onChange={setTab} items={[
      { value: 'active', label: 'Active' }, { value: 'history', label: 'History' }, { value: 'contact', label: 'Contact us' },
    ]} />
    {tab === 'contact' ? <ScrollView><SupportPanel /></ScrollView>
      : <SupportInbox query={query} history={tab === 'history'}
        onOpen={(item) => setSelected({ orderId: item.orderId, caseId: item.id })} />}
  </View>;
}
