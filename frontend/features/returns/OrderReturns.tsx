import { AppLoader } from '../../components/AppLoader';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Order } from '../../services/api/order-api';
import { useReturnCases } from './return-api';
import { ReturnRequestSheet } from './ReturnRequestSheet';
import { remainingQuantity } from './ReturnItemPicker';
import { CustomerCaseScreen } from './CustomerCaseScreen';
import { ActionButton } from './ReturnControls';
import { statusLabels } from './return-types';
import { rs as s } from './return.styles';
import { useAppTheme } from '../../theme/ThemeProvider';

export function OrderReturns({ order, now }: { order: Order; now: number }) {
  const theme = useAppTheme();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useReturnCases(order.id, false, !!order.receivedAt && !order.returnRequestedAt && !selectedId && !creating);
  const cases = query.data?.cases ?? [];
  if (!order.receivedAt || order.returnRequestedAt) return null;
  if (query.isPending) return <AppLoader accessibilityLabel="Loading returns" />;
  if (query.isError && !query.data) return <Pressable onPress={() => void query.refetch()} style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={s.error}>Could not load returns. Tap to retry.</Text></Pressable>;
  const hasRequest = cases.length > 0 || !!order.returnCases?.length;
  const eligible = !hasRequest && order.status === 'delivered' && !!order.returnEligibleUntil && now < new Date(order.returnEligibleUntil).getTime() &&
    order.items.some((_, index) => remainingQuantity(order, cases, index) > 0);
  return <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[s.heading, { color: theme.colors.text }]}>Returns & exchanges</Text>
    {query.isError && <Pressable onPress={() => void query.refetch()}><Text style={s.error}>Showing saved request. Tap to refresh updates.</Text></Pressable>}
    {hasRequest && <Text style={[s.muted, { color: theme.colors.muted }]}>Your request is saved. Track updates or discuss any changes in the same conversation.</Text>}
    {cases.map((item) => <View key={item.id} style={[s.card, { backgroundColor: theme.colors.raised, borderColor: theme.colors.border }]}>
      <View style={s.between}><Text style={[s.heading, { color: theme.colors.text }]}>{item.preference === 'exchange' ? 'Exchange request' : 'Return request'}</Text><Text style={s.badge}>{statusLabels[item.status]}</Text></View>
      <Text selectable style={[s.muted, { color: theme.colors.muted }]}>{item.requestId}</Text>
      {item.unread && <Text style={s.badge}>New support update</Text>}
      <Text style={[s.muted, { color: theme.colors.muted }]}>{item.items.map((product) => `${product.name} × ${product.quantity}`).join(', ')}</Text>
      <ActionButton label="View request / Chat" onPress={() => setSelectedId(item.id)} />
    </View>)}
    {eligible ? <><Text style={[s.muted, { color: theme.colors.muted }]}>Request by {new Date(order.returnEligibleUntil!).toLocaleString('en-IN')}</Text>
      <ActionButton label="Request return / exchange" onPress={() => setCreating(true)} />
    </> : !hasRequest && <Text style={[s.muted, { color: theme.colors.muted }]}>The return request window has closed.</Text>}
    {hasRequest && !cases.length && <Pressable onPress={() => void query.refetch()}><Text style={[s.link, { color: theme.colors.primary }]}>Load existing request</Text></Pressable>}
    {creating && <ReturnRequestSheet order={order} cases={cases} onClose={() => setCreating(false)}
      onOpenCase={(caseId) => { setCreating(false); setSelectedId(caseId); }} />}
    <Modal visible={!!selectedId} animationType="slide" onRequestClose={() => setSelectedId(null)}>
      <SafeAreaView style={[s.page, { backgroundColor: theme.colors.background }]}>
        {selectedId && <CustomerCaseScreen orderId={order.id} caseId={selectedId} initialTab="messages"
          onClose={() => setSelectedId(null)} />}
      </SafeAreaView>
    </Modal>
  </View>;
}
