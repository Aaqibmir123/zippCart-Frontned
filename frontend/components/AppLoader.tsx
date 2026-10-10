import { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicatorProps, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useScreenActive } from '../hooks/useScreenActive';

type Props = ActivityIndicatorProps & { variant?: 'inline' | 'section'; label?: string };

export const AppLoader = memo(function AppLoader({ size = 'small', color, style, animating = true,
  hidesWhenStopped = true, accessibilityLabel = 'Loading', variant = 'inline', label, ...props }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(true);
  const active = useScreenActive();
  const diameter = typeof size === 'number' ? size : size === 'large' || variant === 'section' ? 52 : 24;
  const primary = color ?? '#8739D6';
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReducedMotion(value); }).catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { mounted = false; motion.remove(); };
  }, []);
  useEffect(() => {
    if (!animating || !active || reducedMotion) return;
    const animation = Animated.loop(Animated.timing(progress, {
      toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true, isInteraction: false,
    }));
    animation.start();
    return () => { animation.stop(); progress.setValue(0); };
  }, [active, animating, progress, reducedMotion]);
  if (!animating && hidesWhenStopped) return null;
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <View {...props} accessible accessibilityRole="progressbar" accessibilityLabel={label ?? accessibilityLabel}
    accessibilityState={{ busy: animating }} style={[s.wrapper, variant === 'section' && s.section, style]}>
    <View accessible={false} style={{ width: diameter, height: diameter, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[s.track, { width: diameter, height: diameter, borderRadius: diameter / 2, borderColor: primary }]} />
      <Animated.View style={[s.orbit, { width: diameter, height: diameter, borderRadius: diameter / 2,
        borderTopColor: primary, borderRightColor: color ?? '#EC4899', transform: [{ rotate }] }]} />
      <View style={{ width: diameter * 0.24, height: diameter * 0.24, borderRadius: diameter,
        backgroundColor: color ?? '#FF9947', opacity: 0.9 }} />
    </View>
    {variant === 'section' && <Text style={s.label}>{label ?? accessibilityLabel}</Text>}
  </View>;
});

const s = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  section: { paddingVertical: 28, gap: 16 },
  track: { position: 'absolute', borderWidth: 3, opacity: 0.12 },
  orbit: { position: 'absolute', borderWidth: 3, borderColor: 'transparent' },
  label: { color: '#786687', fontSize: 13, fontWeight: '500', letterSpacing: 0.2 },
});
