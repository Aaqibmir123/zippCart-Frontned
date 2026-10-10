import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = { label: string; onPress: () => void; variant?: 'dark' | 'primary'; disabled?: boolean };
export function PrimaryButton({ label, onPress, variant = 'dark', disabled }: Props) { const gradient = variant === 'primary' ? ['#7479FF', '#5B46EE'] as const : ['#162441', '#07122D'] as const; return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.pressable, pressed && styles.pressed, disabled && styles.disabled]}><LinearGradient colors={gradient} end={{ x: 1, y: 0 }} start={{ x: 0, y: 0 }} style={styles.button}><Text style={styles.label}>{label}</Text></LinearGradient></Pressable>; }
const styles = StyleSheet.create({ pressable: { width: '100%' }, pressed: { opacity: .88 }, disabled: { opacity: .45 }, button: { alignItems: 'center', borderRadius: 14, height: 54, justifyContent: 'center' }, label: { color: '#FFF', fontSize: 15, fontWeight: '700' } });
