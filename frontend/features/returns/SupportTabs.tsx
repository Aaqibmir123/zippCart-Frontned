import { Pressable, Text, View } from 'react-native';
import { supportStyles as s } from './support.styles';

export function SupportTabs<T extends string>({ value, items, onChange }: {
  value: T; items: { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  return <View accessibilityRole="tablist" style={s.tabs}>
    {items.map((item) => <Pressable key={item.value} accessibilityRole="tab"
      accessibilityState={{ selected: value === item.value }}
      onPress={() => onChange(item.value)} style={[s.tab, value === item.value && s.activeTab]}>
      <Text style={[s.tabText, value === item.value && s.activeText]}>{item.label}</Text>
    </Pressable>)}
  </View>;
}
