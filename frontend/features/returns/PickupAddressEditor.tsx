import { AppLoader } from '../../components/AppLoader';
import { Pressable, Text, View } from 'react-native';
import { AddressInput } from '../../services/api/address-api';
import { useAddresses } from '../../services/addresses/address-queries';
import { Field } from './ReturnControls';
import { rs as s } from './return.styles';

const fields: { key: Exclude<keyof AddressInput, 'label'>; label: string; max: number }[] = [
  { key: 'name', label: 'Recipient name', max: 80 }, { key: 'phone', label: 'Mobile number', max: 10 },
  { key: 'line1', label: 'House / flat / building', max: 160 }, { key: 'locality', label: 'Area / street', max: 100 },
  { key: 'district', label: 'District', max: 80 }, { key: 'landmark', label: 'Landmark (optional)', max: 120 }, { key: 'city', label: 'City', max: 80 },
  { key: 'state', label: 'State', max: 80 }, { key: 'pincode', label: 'PIN code', max: 6 },
];
export const addressText = (address: AddressInput) => [address.line1, address.locality, address.landmark,
  address.district, address.city, address.state, address.pincode].filter(Boolean).join(', ');
export function validAddress(address: AddressInput) {
  return address.name.trim().length >= 2 && /^[6-9]\d{9}$/.test(address.phone) && /^[1-9]\d{5}$/.test(address.pincode) &&
    address.line1.trim().length >= 3 && [address.locality, address.city, address.state].every((v) => v.trim().length >= 2);
}
export function PickupAddressEditor({ value, onChange, disabled = false }: {
  value: AddressInput; onChange: (value: AddressInput) => void; disabled?: boolean;
}) {
  const addresses = useAddresses();
  return <View style={s.card}>
    <Text style={s.heading}>Confirm pickup address</Text>
    {addresses.isPending && <AppLoader />}
    {addresses.isError && <Pressable onPress={() => void addresses.refetch()}><Text style={s.error}>Saved addresses unavailable. Tap to retry, or enter an address below.</Text></Pressable>}
    <View style={s.row}>{addresses.data?.addresses.map(({ id, ...address }) => <Pressable key={id}
      disabled={disabled} onPress={() => onChange(address)} style={s.secondary}>
      <Text style={s.link}>{address.label} · {address.name}</Text><Text style={s.muted}>{address.line1}, {address.pincode}</Text>
    </Pressable>)}</View>
    {fields.map(({ key, label, max }) => <Field key={key} label={label} value={value[key] ?? ''} maxLength={max}
      numeric={key === 'phone' || key === 'pincode'} disabled={disabled}
      onChange={(next) => onChange({ ...value, [key]: key === 'phone' || key === 'pincode' ? next.replace(/\D/g, '') : next })} />)}
    <Text style={s.muted}>Used for this return only. Your saved addresses stay unchanged.</Text>
  </View>;
}
