import { Text, View } from 'react-native';
import { Operations, operationsOptions } from './operations-model';

export function OperationsBadges({ value }: { value: Operations }) {
  const keys = [value.stage, ...value.support.map((item) => item === 'exchange' ? 'exchanges' : 'returns')];
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 }}>
    {keys.map((key) => {
      const tone = operationsOptions.find((item) => item.key === key)!;
      return <Text key={key} style={{ color: tone.color, backgroundColor: tone.bg, overflow: 'hidden', borderRadius: 8,
        paddingHorizontal: 9, paddingVertical: 6, fontWeight: '700', fontSize: 12 }}>{tone.label}</Text>;
    })}
  </View>;
}
