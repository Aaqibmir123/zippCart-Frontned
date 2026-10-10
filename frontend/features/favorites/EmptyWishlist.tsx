import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { HomeIcon } from '../home/HomeIcon';

export function EmptyWishlist({ onExplore }: { onExplore: () => void }) {
  const focused = useIsFocused();
  const progress = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReducedMotion(value);
    }).catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const app = AppState.addEventListener('change', (value) => setActive(value === 'active'));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    if (!focused || !active || reducedMotion) return;
    const timing = (toValue: number) => Animated.timing(progress, { toValue, duration: 1500,
      easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false });
    const animation = Animated.loop(Animated.sequence([timing(1), timing(0)]));
    animation.start();
    return () => { animation.stop(); progress.setValue(0); };
  }, [active, focused, progress, reducedMotion]);

  return <View style={s.container}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.art}>
      <View style={s.orbit} /><View style={s.dot} />
      <Animated.View style={{ transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
        { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '3deg'] }) }] }}>
        <LinearGradient colors={['#FCE4F1', '#E9DEFF']} style={s.tile}>
          <HomeIcon name="heart" size={54} color="#CC438C" filled />
        </LinearGradient>
      </Animated.View>
      <View style={s.spark} />
    </View>
    <Text style={s.title}>No favourites yet</Text>
    <Text style={s.copy}>Tap a heart to save a find.</Text>
    <Pressable accessibilityRole="button" onPress={onExplore}
      style={({ pressed }) => [s.button, pressed && { opacity: 0.8 }]}>
      <Text style={s.buttonText}>Explore products</Text><HomeIcon name="arrow" color="#FFFFFF" size={18} />
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, paddingBottom: 48 },
  art: { width: 190, height: 170, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  orbit: { position: 'absolute', width: 166, height: 166, borderRadius: 83, borderWidth: 1, borderColor: '#E9DFF2' },
  tile: { width: 108, height: 116, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', right: 9, top: 30, width: 13, height: 13, borderRadius: 7, backgroundColor: '#EDB6D5' },
  spark: { position: 'absolute', left: 15, bottom: 24, width: 10, height: 10, borderRadius: 3,
    backgroundColor: '#FFBC87', transform: [{ rotate: '25deg' }] },
  title: { color: '#322041', fontSize: 21, fontWeight: '700', textAlign: 'center' },
  copy: { color: '#8B7B98', fontSize: 13, marginTop: 8, textAlign: 'center' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24,
    backgroundColor: '#7541A5', minHeight: 48, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
