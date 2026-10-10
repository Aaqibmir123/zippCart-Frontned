import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../../theme';
import { useAppTheme } from '../../../theme/ThemeProvider';

const AnimatedPath = Animated.createAnimatedComponent(Path);
export function OrderSuccess({ orderId, onDone, onViewOrder }: { orderId: string; onDone: () => void; onViewOrder: () => void }) {
  const theme = useAppTheme();
  const reveal = useRef(new Animated.Value(0)).current;
  const tick = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onDone(); return true; });
    AccessibilityInfo.announceForAccessibility('Order placed successfully.');
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => true).then((reduce) => {
      if (!active) return;
      if (reduce) { reveal.setValue(1); tick.setValue(1); return; }
      Animated.parallel([
        Animated.spring(reveal, { toValue: 1, damping: 12, stiffness: 120, mass: 0.7, useNativeDriver: true }),
        Animated.timing(tick, { toValue: 1, duration: 500, delay: 180, useNativeDriver: false }),
      ]).start();
    });
    return () => { active = false; back.remove(); reveal.stopAnimation(); tick.stopAnimation(); };
  }, [onDone, reveal, tick]);
  return <View style={[s.page, { backgroundColor: theme.colors.background }]}>
    <View style={s.art}>
      <Animated.View style={[s.halo, { opacity: reveal, transform: [{ scale: reveal }] }]} />
      {[[-82, -55], [76, -70], [-88, 44], [85, 51], [20, -94], [-28, 89]].map(([x, y], index) => (
        <Animated.View key={index} style={[s.spark, { backgroundColor: index % 2 ? '#D7B875' : '#8DBDA0', opacity: reveal, transform: [{ translateX: reveal.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) }, { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) }] }]} />
      ))}
      <Animated.View style={[s.circle, { opacity: reveal, transform: [{ scale: reveal }] }]}>
        <Svg width={64} height={64} viewBox="0 0 64 64" fill="none"><AnimatedPath d="m15 33 11 11 24-25" stroke="white" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset={tick.interpolate({ inputRange: [0, 1], outputRange: [60, 0] })} /></Svg>
      </Animated.View>
    </View>
    <Text style={[s.eyebrow, { color: theme.colors.muted }]}>THANK YOU FOR SHOPPING WITH JhelumKart</Text>
    <Text accessibilityRole="header" style={[s.title, { color: theme.colors.text }]}>Order placed!</Text>
    <Text style={[s.copy, { color: theme.colors.muted }]}>Pay cash when your order arrives.</Text>
    <View style={[s.pill, { backgroundColor: theme.colors.raised }]}><Text selectable style={[s.order, { color: theme.colors.muted }]}>ORDER ID {orderId.toUpperCase()}</Text></View>
    <Pressable accessibilityRole="button" onPress={onViewOrder} style={s.viewButton}><Text style={s.viewText}>View order details</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={onDone} style={s.homeButton}><Text style={[s.homeText, { color: theme.colors.primary }]}>Continue shopping</Text></Pressable>
  </View>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F2F7F2', justifyContent: 'center', alignItems: 'center', padding: 28 }, art: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  halo: { position: 'absolute', width: 176, height: 176, borderRadius: 88, backgroundColor: '#E1EFE2' }, circle: { width: 116, height: 116, borderRadius: 58, backgroundColor: '#468567', alignItems: 'center', justifyContent: 'center' }, spark: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  eyebrow: { color: '#839786', fontSize: 8, fontWeight: '800', letterSpacing: 1.4, textAlign: 'center' }, title: { fontSize: 34, fontWeight: '900', color: colors.ink, marginTop: 14, letterSpacing: -1 }, copy: { color: '#708176', fontSize: 13, marginTop: 10, textAlign: 'center' }, pill: { backgroundColor: '#E5EEE5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 24 }, order: { color: '#51735D', fontSize: 10, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  viewButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#253547', borderRadius: 14, paddingHorizontal: 28, marginTop: 28 },
  viewText: { color: '#fff', fontWeight: '800', fontSize: 14 }, homeButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginTop: 9 },
  homeText: { color: '#51735D', fontWeight: '800', fontSize: 13 },
});
