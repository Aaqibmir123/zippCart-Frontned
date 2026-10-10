import { StyleSheet, Text } from 'react-native';

import { Screen } from './Screen';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <Screen>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    marginTop: 32,
  },
  description: {
    color: colors.mutedText,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    marginTop: 12,
  },
});