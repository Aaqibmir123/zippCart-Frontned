import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { orderTheme as t } from './order-theme';
import { useAppTheme } from '../../theme/ThemeProvider';

export function OrderFlowHeader({ title, subtitle, onBack, disabled, children }: {
  title: string; subtitle?: string; onBack: () => void; disabled?: boolean; children?: ReactNode;
}) {
  const theme = useAppTheme();
  return <LinearGradient colors={theme.isDark ? [theme.colors.surface, theme.colors.background] : ['#FFFFFF', t.tint]} style={s.header}>
    <View style={s.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={disabled}
        onPress={onBack} style={[s.back, { backgroundColor: theme.colors.raised }, disabled && { opacity: 0.4 }]}><Text style={[s.arrow, { color: theme.colors.primary }]}>‹</Text></Pressable>
      <View style={s.copy}><Text accessibilityRole="header" style={[s.title, { color: theme.colors.text }]}>{title}</Text>
        {subtitle && <Text style={[s.subtitle, { color: theme.colors.muted }]}>{subtitle}</Text>}</View>
    </View>{children}
  </LinearGradient>;
}
const s = StyleSheet.create({
  header: { padding: 16, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  arrow: { color: t.primary, fontSize: 30, lineHeight: 34 },
  copy: { flex: 1 }, title: { color: t.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: t.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
