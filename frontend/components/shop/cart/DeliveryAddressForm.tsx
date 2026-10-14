import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { AddressInput } from '../../../services/api/address-api';
import { additionalAddressFields, addressFields, validateAddress } from './address-form';
import { addressStyles as s } from './address.styles';
import { useAppTheme } from '../../../theme/ThemeProvider';

type Props = { form: AddressInput; errors: Partial<Record<keyof AddressInput, string>>;
  pending: boolean;
  onChange: (key: keyof AddressInput, value: string) => void };
export function DeliveryAddressForm({ form, errors, pending, onChange }: Props) {
  const theme = useAppTheme();
  const [revealedFields, setRevealedFields] = useState<Partial<Record<keyof AddressInput, string | boolean>>>(validateAddress(form));
  const field = (item: typeof addressFields[number]) => {
    const { key } = item;
    return <View key={key} style={s.field}>
      <Text style={[s.fieldLabel, { color: theme.colors.text }]}>{item.label}</Text>
      <TextInput accessibilityLabel={item.label} editable={!pending}
        accessibilityHint={errors[key]} value={form[key]} onChangeText={(value) => {
          setRevealedFields((current) => ({ ...current, [key]: true }));
          onChange(key, item.numeric ? value.replace(/\D/g, '') : value);
        }}
        placeholder={item.placeholder} placeholderTextColor={theme.colors.muted} keyboardType={item.numeric ? 'number-pad' : 'default'}
        autoCapitalize={item.numeric ? 'none' : 'words'}
        maxLength={item.max} style={[s.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }, !!errors[key] && s.inputError]} />
      {!!errors[key] && <Text accessibilityRole="alert" style={s.error}>{errors[key]}</Text>}
    </View>;
  };
  return <>
    <Text style={[s.body, { color: theme.colors.muted }]}>Enter all four address details so we can find you easily.</Text>
    {addressFields.map(field)}
    {additionalAddressFields.filter(({ key }) => revealedFields[key] || errors[key]).map(field)}
      <View style={s.chips}>{(['Home', 'Work', 'Other'] as const).map((label) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: form.label === label }} disabled={pending} key={label} onPress={() => onChange('label', label)} style={[s.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, form.label === label && s.selectedChip]}><Text style={[s.link, { color: theme.colors.primary }]}>{label}</Text></Pressable>)}</View>
    {!!errors.label && <Text accessibilityRole="alert" style={s.error}>{errors.label}</Text>}
  </>;
}
