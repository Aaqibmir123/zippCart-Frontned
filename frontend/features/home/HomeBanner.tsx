import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HomeIcon } from './HomeIcon';
import { useAppTheme } from '../../theme/ThemeProvider';

export function HomeBanner({ onShop }: { onShop: () => void }) {
  const theme = useAppTheme();
  const progress = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; listener.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 650,
      easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  return <LinearGradient colors={theme.isDark ? ['#261B39', '#4C326A', '#783B65'] : ['#39215D', '#773CB0', '#CB5593']}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.banner}>
    <View pointerEvents="none" accessible={false} style={s.art}>
      <View style={s.ring} /><View style={s.glow} />
      <Animated.View style={[s.bag, { opacity: progress, transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }, { rotate: '12deg' },
      ] }]}><HomeIcon name="cart" color="#67359A" size={48} /></Animated.View>
      <View style={s.spark} />
    </View>
    <View style={s.copy}>
      <Text style={s.title}>Find your{ '\n' }next favourite.</Text>
      <Pressable accessibilityRole="button" onPress={onShop}
        style={({ pressed }) => [s.button, { backgroundColor: theme.colors.surface }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}>
        <Text style={[s.buttonText, { color: theme.colors.primary }]}>Explore</Text><HomeIcon name="arrow" size={18} color={theme.colors.primary} />
      </Pressable>
    </View>
  </LinearGradient>;
}

const s = StyleSheet.create({
  banner: { minHeight: 218, borderRadius: 26, overflow: 'hidden' },
  copy: { padding: 22, paddingRight: 112, gap: 18 },
  title: { color: '#FFFFFF', fontSize: 29, fontWeight: '800', letterSpacing: -0.8 },
  button: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 12,
    minHeight: 44, paddingHorizontal: 16, borderRadius: 15, backgroundColor: '#FFFFFF', marginTop: 2 },
  buttonText: { color: '#40215E', fontSize: 13, fontWeight: '700' },
  art: { position: 'absolute', right: -22, bottom: -12, width: 130, height: 188 },
  ring: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 1,
    borderColor: '#FFFFFF30', top: 2, left: -10 },
  glow: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: '#F4A4D32B', top: 28 },
  bag: { top: 62, left: 3, width: 88, height: 98, borderRadius: 23, backgroundColor: '#FFE8F3',
    alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', width: 12, height: 12, borderRadius: 4, backgroundColor: '#FFB776',
    top: 35, left: 70, transform: [{ rotate: '25deg' }] },
});
