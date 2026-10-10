import { StyleSheet, View } from 'react-native';
import { BrandLogo } from './brand/BrandLogo';
import { BrandWordmark } from './brand/BrandWordmark';

export function BrandMark({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return <View style={s.row}>
    <BrandLogo size={compact ? 36 : 46} />
    {!compact && <BrandWordmark style={[s.name, dark && s.light]} />}
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: '#082725', fontSize: 25, fontWeight: '800', letterSpacing: -1 },
  light: { color: 'white' },
});
