import { SplashArtwork } from '../features/auth/SplashArtwork';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function SessionLoader({ onRetry }: { onRetry?: () => void }) {
  useEffect(() => {
    if (onRetry) console.info('[auth-debug] SessionLoader switched to error UI');
  }, [onRetry]);
  return <SplashArtwork>
    {onRetry ? <View style={s.recovery}>
      <Text style={s.title}>Session check unavailable</Text>
      <Text style={s.message}>We couldn’t check your session. Check your connection and try again.</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={s.button}>
        <Text style={s.buttonText}>Try again</Text>
      </Pressable>
    </View> : null}
  </SplashArtwork>;
}

const s = StyleSheet.create({
  recovery: { alignItems: 'center', marginTop: 28, paddingHorizontal: 28 },
  title: { color: '#17221A', fontSize: 18, fontWeight: '700' },
  message: { color: '#5B665E', fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  button: { alignItems: 'center', backgroundColor: '#13872E', borderRadius: 14, marginTop: 18, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
