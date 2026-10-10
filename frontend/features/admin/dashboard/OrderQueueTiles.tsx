import { Pressable, Text, View } from 'react-native';
import { AdminAnalytics, OrderQueue, queueOptions } from './dashboard-api';
import { ds as s } from './dashboard.styles';
export function OrderQueueTiles({ counts, selected, onSelect }: { counts?: AdminAnalytics['queues']; selected?: OrderQueue; onSelect: (queue: OrderQueue) => void }) {
  return <View style={s.grid}>{queueOptions.map((queue) => <Pressable key={queue.key} accessibilityRole="button"
    accessibilityLabel={`${queue.label}: ${counts?.[queue.key] ?? 'loading'}`} accessibilityState={{ selected: selected === queue.key }}
    onPress={() => onSelect(queue.key)} style={[s.tile, { backgroundColor: queue.bg, borderWidth: 1, borderColor: selected === queue.key ? queue.color : queue.bg }]}>
    <Text style={[s.number, { color: queue.color }]}>{counts?.[queue.key] ?? '—'}</Text>
    <Text style={[s.tileLabel, { color: queue.color }]}>{queue.label}</Text>
  </Pressable>)}</View>;
}
