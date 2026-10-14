import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProductCategory } from '../../data/products';
import { HomeIcon } from './HomeIcon';
import { useAppTheme } from '../../theme/ThemeProvider';

const categories: { value: ProductCategory; label: string; icon: string; color: string }[] = [
  { value: 'Fashion', label: 'Fashion', icon: '👗', color: '#FFEDF4' },
  { value: 'Watches', label: 'Watches', icon: '⌚', color: '#EAF6FF' },
  { value: 'Beauty', label: 'Beauty', icon: '🧴', color: '#FFF0E9' },
  { value: 'Electronics', label: 'Electronics', icon: '🎧', color: '#EEEDFF' },
  { value: 'Home', label: 'Home & Living', icon: '🛋️', color: '#E6FBF2' },
  { value: 'Accessories', label: 'Accessories', icon: '👜', color: '#FFF3E5' },
  { value: 'Other', label: 'Other', icon: '', color: '#F7F7FD' },
];

export function HomeCategories({ selected, onSelect }: { selected: ProductCategory | 'All'; onSelect: (value: ProductCategory | 'All') => void }) {
  const theme = useAppTheme();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
    {categories.map((category) => <Pressable key={category.value} accessibilityRole="button"
      accessibilityState={{ selected: selected === category.value }} onPress={() => onSelect(selected === category.value ? 'All' : category.value)} style={s.category}>
      <View style={[s.tile, { backgroundColor: theme.isDark ? theme.colors.raised : category.color, borderColor: selected === category.value ? theme.colors.accent : theme.colors.border }]}>
        {category.icon ? <Text style={s.emoji}>{category.icon}</Text> : <HomeIcon name="grid" size={27} color={theme.colors.text} />}
      </View>
      <Text numberOfLines={1} style={[s.label, { color: theme.colors.muted }, selected === category.value && { color: theme.colors.accent }]}>{category.label}</Text>
    </Pressable>)}
  </ScrollView>;
}
const s = StyleSheet.create({
  rail: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 4, gap: 10 },
  category: { width: 65, alignItems: 'center', gap: 7 },
  tile: { height: 58, width: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  emoji: { fontSize: 32 },
  label: { fontSize: 10, fontWeight: '600' },
});
