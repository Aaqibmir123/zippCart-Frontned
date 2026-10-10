import { Pressable, Text, View } from 'react-native';
import { Statement } from './earnings-api';
import { dateLabel } from './payout-format';
import { ps as s } from './payout.styles';

export function StatementPeriod({ period, data, onPeriod, onShift, onToday, seller = false }: {
  period: 'week' | 'month'; data?: Statement; seller?: boolean; onPeriod: (period: 'week' | 'month') => void;
  onShift: (direction: number) => void; onToday: () => void;
}) {
  const nextDisabled = !data || new Date(data.to).getTime() > Date.now();
  return <>
    <View style={seller ? s.sellerTabs : s.tabs}>{(['week', 'month'] as const).map((value) => <Pressable key={value}
      accessibilityRole="tab" accessibilityState={{ selected: value === period }}
      onPress={() => onPeriod(value)} style={[seller ? s.sellerTab : s.tab, value === period && (seller ? s.sellerActiveTab : s.active)]}>
      <Text style={seller ? s.sellerLink : s.link}>{value === 'week' ? 'Weekly' : 'Monthly'}</Text>
    </Pressable>)}</View>
    <View style={s.row}>
      <Pressable accessibilityLabel="Previous period" style={s.touch} onPress={() => onShift(-1)}><Text style={seller ? s.sellerLink : s.link}>← Previous</Text></Pressable>
      <Pressable style={s.touch} onPress={onToday}><Text style={seller ? s.sellerLink : s.link}>Current</Text></Pressable>
      <Pressable accessibilityLabel="Next period" style={[s.touch, nextDisabled && { opacity: 0.35 }]}
        disabled={nextDisabled} onPress={() => onShift(1)}><Text style={seller ? s.sellerLink : s.link}>Next →</Text></Pressable>
    </View>
    {data && <Text style={seller ? s.sellerMuted : s.muted}>{dateLabel(data.from)} – {dateLabel(new Date(new Date(data.to).getTime() - 1).toISOString())} · IST</Text>}
  </>;
}
