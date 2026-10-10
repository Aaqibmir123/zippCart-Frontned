import { useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import type { AddressInput } from '../../../services/api/address-api';
import type { DeliveryLocationState } from '../../../features/location/useDeliveryLocation';
import { AppLoader } from '../../AppLoader';
import { additionalAddressFields, addressFields, validateAddress } from './address-form';
import { addressStyles as s } from './address.styles';
import { useAppTheme } from '../../../theme/ThemeProvider';

type Props = { form: AddressInput; errors: Partial<Record<keyof AddressInput, string>>;
  pending: boolean; location: DeliveryLocationState; onLocate: () => void;
  onChange: (key: keyof AddressInput, value: string) => void };
const locationMessages: Record<string, string> = {
  permission: 'Use your location to fill in the area, city and PIN code.',
  denied: 'Location access is off. Enable it in Settings or enter your address below.',
  unavailable: 'Could not get your location. Check phone location services and try again, or enter your address.',
  no_address: 'Location found, but no postal address was available. Enter the address below.',
  outside_india: 'Delivery is available in India. Enter an Indian delivery address.',
  error: 'Could not look up the address. Try again or enter it below.',
};
export function DeliveryAddressForm({ form, errors, pending, location, onLocate, onChange }: Props) {
  const theme = useAppTheme();
  const [settingsError, setSettingsError] = useState('');
  const [revealedFields, setRevealedFields] = useState<Partial<Record<keyof AddressInput, string | boolean>>>(validateAddress(form));
  const locating = location.status === 'loading';
  const field = (item: typeof addressFields[number]) => {
    const { key } = item;
    return <View key={key} style={s.field}>
      <Text style={[s.fieldLabel, { color: theme.colors.text }]}>{item.label}</Text>
      <TextInput accessibilityLabel={item.label} editable={!pending && !locating}
        accessibilityHint={errors[key]} value={form[key]} onChangeText={(value) => {
          setRevealedFields((current) => ({ ...current, [key]: true }));
          onChange(key, item.numeric ? value.replace(/\D/g, '') : value);
        }}
        placeholder={item.placeholder} placeholderTextColor="#9299AD" keyboardType={item.numeric ? 'number-pad' : 'default'}
        maxLength={item.max} style={[s.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }, !!errors[key] && s.inputError]} />
      {!!errors[key] && <Text accessibilityRole="alert" style={s.error}>{errors[key]}</Text>}
    </View>;
  };
  return <>
    <View style={[s.locationCard, theme.isDark && { backgroundColor: theme.colors.raised }]}>
      <Pressable accessibilityRole="button" disabled={pending || locating} onPress={onLocate} style={s.locationAction}>
        {locating ? <AppLoader accessibilityLabel="Finding your delivery area" /> : <Text style={[s.link, { color: theme.colors.primary }]}>Use current location</Text>}
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={[s.body, { color: theme.colors.muted }]}>{locating ? 'Finding your area...' : location.status === 'ready'
        ? 'Area detected. GPS may be approximate; confirm or correct the area and address before saving.' : locationMessages[location.status] ?? 'Fill in your area automatically, then confirm your delivery address.'}</Text>
      {location.status === 'denied' && <Pressable accessibilityRole="button" style={s.smallButton}
        onPress={() => void Linking.openSettings().catch(() => setSettingsError('Open your phone Settings to allow location for JhelumKart.'))}>
        <Text style={[s.link, { color: theme.colors.primary }]}>Open Settings</Text>
      </Pressable>}
      {!!settingsError && <Text style={s.error}>{settingsError}</Text>}
    </View>
    {addressFields.map(field)}
    {additionalAddressFields.filter(({ key }) => revealedFields[key] || errors[key]).map(field)}
      <View style={s.chips}>{(['Home', 'Work', 'Other'] as const).map((label) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: form.label === label }} disabled={pending} key={label} onPress={() => onChange('label', label)} style={[s.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, form.label === label && s.selectedChip]}><Text style={[s.link, { color: theme.colors.primary }]}>{label}</Text></Pressable>)}</View>
    {!!errors.label && <Text accessibilityRole="alert" style={s.error}>{errors.label}</Text>}
  </>;
}
