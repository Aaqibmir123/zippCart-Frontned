import { AppLoader } from '../../components/AppLoader';
import { ReactNode, useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useReturnCases } from './return-api';
import { ReturnCase, statusLabels } from './return-types';
import { ReturnConversation } from './ReturnConversation';
import { ReturnHistory } from './ReturnHistory';
import { SupportTabs } from './SupportTabs';
import { nextStep } from './support-model';
import { supportStyles as s } from './support.styles';
import { rs } from './return.styles';

export function SupportCaseScreen({ orderId, caseId, onClose, admin = false, initialTab = 'messages', renderDetails }: {
  orderId: string; caseId: string; onClose: () => void; admin?: boolean;
  initialTab?: 'messages' | 'details'; renderDetails: (record: ReturnCase) => ReactNode;
}) {
  const [tab, setTab] = useState<'messages' | 'details' | 'history'>(initialTab);
  const query = useReturnCases(orderId, admin);
  const record = query.data?.cases.find((item) => item.id === caseId);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => listener.remove();
  }, [onClose]);
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to support inbox" onPress={onClose} style={s.back}>
        <Text style={s.backText}>‹</Text>
      </Pressable>
      <View style={s.avatar}><Text style={s.initials}>{admin ? 'CU' : 'Z'}</Text></View>
      <View style={s.flex}><Text style={s.title}>{admin ? 'Customer conversation' : 'JhelumKart support'}</Text>
        <Text numberOfLines={1} style={s.subtitle}>{record?.items[0]?.name || 'Return & exchange support'}</Text></View>
    </View>
    {query.isPending ? <AppLoader accessibilityLabel="Loading conversation" /> : !record ? <View style={s.empty}>
      <Text style={rs.error}>Could not load this request.</Text>
      <Pressable onPress={() => void query.refetch()} style={rs.secondary}><Text style={rs.link}>Try again</Text></Pressable>
    </View> : <>
      <Pressable accessibilityRole="button" accessibilityLabel="View request details" onPress={() => setTab('details')} style={s.summary}>
        <Text style={s.status}>{statusLabels[record.status]}</Text>
        <Text style={s.subtitle}>{admin ? (record.preference === 'refund' ? 'Refund' : 'Exchange') + ' request · ' + record.requestId : nextStep[record.status]}</Text>
      </Pressable>
      <SupportTabs value={tab} onChange={setTab} items={[
        { value: 'messages', label: record.unread ? 'Chat •' : 'Chat' },
        { value: 'details', label: admin ? 'Manage' : 'Details' },
        { value: 'history', label: 'History' },
      ]} />
      {query.isError && <Pressable style={s.notice} onPress={() => void query.refetch()}>
        <Text style={rs.error}>Updates unavailable. Showing saved messages. Tap to retry.</Text>
      </Pressable>}
      <View style={[s.flex, tab !== 'messages' && s.hidden]}>
        <ReturnConversation key={record.id} record={record} admin={admin} active={tab === 'messages'} />
      </View>
      {tab === 'details' && <ScrollView contentContainerStyle={rs.content} keyboardShouldPersistTaps="handled">{renderDetails(record)}</ScrollView>}
      {tab === 'history' && <ReturnHistory record={record} />}
    </>}
  </KeyboardAvoidingView>;
}
