import type { AddressInput } from '../../../services/api/address-api';
import type { DetectedAddress } from '../../../features/location/delivery-location';

export const blankAddress: AddressInput = { name: '', phone: '', line1: '', locality: '', district: '', landmark: '', city: '', state: '', pincode: '', label: 'Home' };
export const addressFields: { key: Exclude<keyof AddressInput, 'label'>; label: string; placeholder: string; max: number; numeric?: boolean }[] = [
  { key: 'locality', label: 'Current Area / Village', placeholder: 'Enter your village / area', max: 100 },
  { key: 'line1', label: 'Building / House / Shop name', placeholder: 'Building, house or shop name', max: 160 },
  { key: 'district', label: 'District', placeholder: 'District', max: 80 },
  { key: 'pincode', label: 'PIN Code', placeholder: '6-digit PIN code', max: 6, numeric: true },
];
// Keep the normal form compact, but let the user correct invalid hidden values.
export const additionalAddressFields: typeof addressFields = [
  { key: 'name', label: 'Recipient name', placeholder: 'Enter recipient name', max: 80 },
  { key: 'phone', label: 'Mobile number', placeholder: '10-digit delivery contact number', max: 10, numeric: true },
  { key: 'city', label: 'City / Town', placeholder: 'City / Town', max: 80 },
  { key: 'state', label: 'State', placeholder: 'State', max: 80 },
  { key: 'landmark', label: 'Landmark', placeholder: 'Nearby landmark', max: 120 },
];
export const areaKeys = ['locality', 'district', 'pincode'] as const;
const detectedKeys = [...areaKeys, 'city', 'state'] as const;
export function fillDetectedAddress<T extends AddressInput>(form: T, address: DetectedAddress, replace = false): T {
  const next = { ...form };
  for (const key of detectedKeys) if (replace || !form[key].trim()) next[key] = address[key];
  return next;
}
export function validateAddress(form: AddressInput & { id?: string }) {
  const errors: Partial<Record<keyof AddressInput, string>> = {};
  for (const { key, label, max } of addressFields) {
    const missingLegacyDistrict = key === 'district' && !!form.id && !form.district.trim();
    if (key !== 'landmark' && key !== 'city' && !missingLegacyDistrict
      && form[key].trim().length < (key === 'line1' ? 3 : 2)) errors[key] = 'Enter ' + label.toLowerCase() + '.';
    if (form[key].trim().length > max) errors[key] = label + ' is too long.';
  }
  if (form.name.trim().length < 2) errors.name = 'Enter recipient name.';
  if (form.name.trim().length > 80) errors.name = 'Recipient name is too long.';
  if (!/^[6-9]\d{9}$/.test(form.phone.trim())) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  if (form.phone.trim().length > 10) errors.phone = 'Mobile number is too long.';
  if (!/^[1-9]\d{5}$/.test(form.pincode.trim())) errors.pincode = 'Enter a valid 6-digit PIN code.';
  for (const { key, label, max } of additionalAddressFields) {
    if (form[key].trim().length > max) errors[key] = label + ' is too long.';
  }
  if (!['Home', 'Work', 'Other'].includes(form.label)) errors.label = 'Choose Home, Work or Other.';
  return errors;
}

export function addressFieldErrors(issues?: Record<string, string[]>): Partial<Record<keyof AddressInput, string>> {
  const errors: Partial<Record<keyof AddressInput, string>> = {};
  for (const key of Object.keys(blankAddress) as (keyof AddressInput)[]) {
    if (issues?.[key]?.[0]) errors[key] = issues[key][0];
  }
  return errors;
}
