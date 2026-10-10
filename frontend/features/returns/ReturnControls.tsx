import { AppLoader } from '../../components/AppLoader';
import { Pressable, Text, TextInput, View } from 'react-native';
import { rs as s } from './return.styles';

export function ActionButton({ label, onPress, disabled = false, pending = false }: {
  label: string; onPress: () => void; disabled?: boolean; pending?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || pending, busy: pending }}
    disabled={disabled || pending} onPress={onPress} style={[s.button, (disabled || pending) && s.disabled]}>
    {pending ? <AppLoader color="#fff" /> : <Text style={s.buttonText}>{label}</Text>}
  </Pressable>;
}
export function Field({ label, value, onChange, multiline = false, numeric = false, disabled = false, maxLength = 1000,
  secure = false, autoCapitalize = 'sentences' }: {
  label: string; value: string; onChange: (value: string) => void; multiline?: boolean; numeric?: boolean; disabled?: boolean; maxLength?: number;
  secure?: boolean; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return <View><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value}
    onChangeText={onChange} editable={!disabled} multiline={multiline} keyboardType={numeric ? 'numeric' : 'default'}
    maxLength={maxLength} secureTextEntry={secure} autoCapitalize={autoCapitalize} autoCorrect={false}
    style={[s.input, multiline && s.multiline]} /></View>;
}
export function Choices<T extends string>({ value, values, onChange, disabled = false }: {
  value: T; values: { value: T; label: string }[]; onChange: (value: T) => void; disabled?: boolean;
}) {
  return <View style={s.row}>{values.map((entry) => <Pressable key={entry.value} accessibilityRole="radio"
    accessibilityState={{ checked: value === entry.value, disabled }} disabled={disabled}
    onPress={() => onChange(entry.value)} style={[s.secondary, value === entry.value && s.selected]}>
    <Text style={s.link}>{entry.label}</Text></Pressable>)}</View>;
}
