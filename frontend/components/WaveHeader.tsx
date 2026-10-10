import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

type Props = { title: string; badge?: string; background?: string; children?: ReactNode; action?: ReactNode; onBack?: () => void; backDisabled?: boolean };
export function WaveHeader({ title, badge, background = '#F2F5F7', children, action, onBack, backDisabled }: Props) {
  return <LinearGradient colors={['#253652', '#535794', '#8B79B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
    <View pointerEvents="none" style={s.orbit} /><View pointerEvents="none" style={s.glow} />
    <View style={s.row}>{onBack && <Pressable accessibilityLabel="Go back" disabled={backDisabled} onPress={onBack} style={s.back}><Text style={s.backText}>{"\u2039"}</Text></Pressable>}<Text accessibilityRole="header" style={s.title}>{title}</Text>{badge && <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View>}{action}</View>
    {children && <View style={s.content}>{children}</View>}
    <Svg pointerEvents="none" style={s.wave} width="100%" height={30} viewBox="0 0 360 30" preserveAspectRatio="none"><Path d="M0 8Q90 36 180 13T360 12V30H0Z" fill={background} /></Svg>
  </LinearGradient>;
}
const s = StyleSheet.create({
  header: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 44, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, title: { flex: 1, color: 'white', fontSize: 24, fontWeight: '800', letterSpacing: -0.7 },
  badge: { backgroundColor: '#FFFFFF20', borderColor: '#FFFFFF30', borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 }, badgeText: { color: '#F1EDFF', fontSize: 11, fontWeight: '700' },
  back: { width: 36, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#FFFFFF15' }, backText: { color: 'white', fontSize: 29 },
  content: { marginTop: 22 }, orbit: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: '#FFFFFF18', right: -40, top: -95 }, glow: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: '#FFFFFF08', right: 12, top: -46 }, wave: { position: 'absolute', left: 0, bottom: -1 },
});
