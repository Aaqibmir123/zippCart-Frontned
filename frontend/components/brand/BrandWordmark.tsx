import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { APP_NAME } from './brand';

export function BrandWordmark({ style }: { style?: StyleProp<TextStyle> }) {
  return <Text accessibilityLabel={APP_NAME} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
    style={[s.name, style]}>Jhelum<Text style={s.accent}>Kart</Text></Text>;
}

const s = StyleSheet.create({
  name: { color: '#082725', fontWeight: '800', letterSpacing: -1, flexShrink: 1 },
  accent: { color: '#13872E' },
});
