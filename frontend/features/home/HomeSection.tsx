import { Pressable, Text, View } from 'react-native';
import { HomeIcon } from './HomeIcon';
import { h } from './home.styles';
import { useAppTheme } from '../../theme/ThemeProvider';

export function HomeSection({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) {
  const theme = useAppTheme();
  return <View style={h.section}>
    <View style={h.sectionCopy}><Text style={[h.heading, { color: theme.colors.text }]}>{title}</Text>{subtitle && <Text style={[h.hint, { color: theme.colors.muted }]}>{subtitle}</Text>}</View>
    {onSeeAll && <Pressable accessibilityRole="button" accessibilityLabel={`See all ${title.toLowerCase()}`} onPress={onSeeAll} style={h.seeAll}>
      <Text style={[h.link, { color: theme.colors.primary }]}>See All</Text><HomeIcon name="arrow" size={17} color={theme.colors.primary} />
    </Pressable>}
  </View>;
}
