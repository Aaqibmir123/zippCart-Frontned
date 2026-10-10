import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { TimedFeedback } from '../hooks/useTimedFeedback';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = { topOffset?: number; feedback: TimedFeedback | null };
export function TopFeedbackToast({ topOffset = 10, feedback }: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const theme = useAppTheme();
  useEffect(() => {
    opacity.setValue(0);
    const animation = Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true });
    if (feedback) animation.start();
    return () => animation.stop();
  }, [feedback, opacity]);
  if (!feedback) return null;
  const accent = feedback.tone === 'error' ? '#E54864' : feedback.variant === 'favoriteAdded' ? '#8B5CF6' : '#13966D';
  return (
    <Animated.View pointerEvents="none" accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.toast, { top: insets.top + topOffset, opacity, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.rail, { backgroundColor: accent }]} />
      <View style={[styles.mark, { backgroundColor: `${accent}18` }]}>
        <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"><Path d={feedback.tone === 'error' ? 'M12 5v8m0 4v1' : 'm5 12 4 4L19 6'} stroke={accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{feedback.tone === 'error' ? 'Could not complete' : feedback.variant === 'favoriteAdded' ? 'Saved to wishlist' : feedback.variant === 'favoriteRemoved' ? 'Removed from wishlist' : 'Done'}</Text>
        <Text numberOfLines={2} style={[styles.message, { color: theme.colors.muted }]}>{feedback.message}</Text>
      </View>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  toast: { alignItems: 'center', borderRadius: 18, borderWidth: 1, flexDirection: 'row', left: 20, right: 20, minHeight: 72, padding: 13, paddingLeft: 17, position: 'absolute', zIndex: 20, overflow: 'hidden', shadowColor: '#17111F', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 9 },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  mark: { alignItems: 'center', borderRadius: 13, height: 38, justifyContent: 'center', width: 38 },
  copy: { flex: 1, marginLeft: 12, gap: 2 },
  title: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
  message: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
});
