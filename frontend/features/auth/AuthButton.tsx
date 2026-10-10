import { AppLoader } from '../../components/AppLoader';
import { Pressable, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { a } from './auth.styles';
import { useAuthLayout } from './AuthFrame';

export function AuthButton({ label, pending = false, disabled = false, onPress }: {
  label: string; pending?: boolean; disabled?: boolean; onPress: () => void;
}) {
  const { compact } = useAuthLayout();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || pending, busy: pending }}
    disabled={disabled || pending} onPress={onPress} style={({ pressed }) => [a.button, compact && a.buttonCompact, (pressed || disabled || pending) && a.disabled]}>
    <LinearGradient colors={['#249736', '#09822E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[a.buttonInner, compact && a.buttonInnerCompact]}>
      {pending && <AppLoader color="#fff" size="small" />}
      <Text style={a.buttonLabel}>{label}</Text>{!pending && <Text style={a.arrow}>{'\u2192'}</Text>}
    </LinearGradient>
  </Pressable>;
}
