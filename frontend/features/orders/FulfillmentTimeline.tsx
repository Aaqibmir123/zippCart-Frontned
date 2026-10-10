import { StyleSheet, Text, View } from 'react-native';
import { FulfillmentProgress, currentFulfillment, fulfillmentLabel, fulfillmentNotes } from './fulfillment';

export function FulfillmentTimeline({ order, compact = false }: { order: FulfillmentProgress & { status: string }; compact?: boolean }) {
  const status = currentFulfillment(order);
  const steps = order.fulfillmentTimeline ?? [];
  const index = steps.findIndex((step) => step.state === 'current');
  return <View style={s.panel}>
    <View style={s.header}><Text style={s.heading}>{fulfillmentLabel(status)}</Text>
      {index >= 0 && <Text style={s.count}>{index + 1} of {steps.length}</Text>}</View>
    {!!fulfillmentNotes[status] && <Text style={s.note}>{fulfillmentNotes[status]}</Text>}
    {compact ? <View style={s.bars}>{steps.map((step) => <View key={step.status} accessibilityLabel={`${fulfillmentLabel(step.status)}: ${step.state}`} style={[s.bar, step.state !== 'upcoming' && s.filled]} />)}</View>
      : steps.map((step, i) => <View key={step.status} style={s.row}>
        <View style={s.track}>{i < steps.length - 1 && <View style={[s.line, step.state === 'complete' && s.filled]} />}
          <View style={[s.dot, step.state !== 'upcoming' && s.filled]}><Text style={s.check}>{step.state === 'complete' ? '✓' : step.state === 'current' ? '•' : ''}</Text></View></View>
        <View style={s.copy}><Text style={[s.label, step.state === 'upcoming' && s.muted]}>{fulfillmentLabel(step.status)}</Text>
          <Text style={s.meta}>{step.at ? new Date(step.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : step.state === 'upcoming' ? 'Upcoming' : 'Stage reached'}{step.state === 'current' ? ' · Current status' : ''}</Text></View>
      </View>)}
  </View>;
}
const s = StyleSheet.create({
  panel: { backgroundColor: '#F6F0FF', borderColor: '#E7DAFC', borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  heading: { color: '#5922A8', fontSize: 15, fontWeight: '800', flexShrink: 1 },
  count: { color: '#795C9F', fontSize: 11 }, note: { color: '#69567F', fontSize: 12, lineHeight: 18, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12, minHeight: 48 }, track: { width: 22, alignItems: 'center' },
  line: { position: 'absolute', top: 20, bottom: -10, width: 2, backgroundColor: '#E0D3ED' },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E0D3ED', alignItems: 'center', justifyContent: 'center' },
  filled: { backgroundColor: '#7139F5' }, check: { color: '#fff', fontSize: 14, fontWeight: '800' },
  copy: { flex: 1, paddingBottom: 8 }, label: { color: '#332144', fontWeight: '700', fontSize: 13 },
  muted: { color: '#94869F' }, meta: { color: '#8A789A', fontSize: 11, marginTop: 4 },
  bars: { flexDirection: 'row', gap: 4 }, bar: { height: 5, borderRadius: 3, flex: 1, backgroundColor: '#E0D3ED' },
});
