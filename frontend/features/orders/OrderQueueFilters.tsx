import { Pressable, ScrollView, Text, View } from 'react-native';
import { groupOptions, operationsOptions, OperationsQueue } from './operations-model';

export function OrderQueueFilters({ selected, counts, onSelect }: {
  selected: string; counts?: Partial<Record<OperationsQueue, number>>; onSelect: (value: OperationsQueue) => void;
}) {
  return <View style={{ gap: 10 }}>{[groupOptions, operationsOptions].map((options, index) =>
    <ScrollView key={index} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((item) => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: selected === item.key }}
        onPress={() => onSelect(item.key)} style={{ backgroundColor: item.bg, padding: 12, borderRadius: 12, minHeight: 48,
          borderWidth: 2, borderColor: selected === item.key ? item.color : item.bg }}>
        <Text style={{ color: item.color, fontSize: 13, fontWeight: '700' }}>{item.label} ({counts?.[item.key] ?? '—'})</Text>
      </Pressable>)}
    </ScrollView>)}
  </View>;
}
