import { AppLoader } from '../../AppLoader';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { Address, AddressInput } from '../../../services/api/address-api';
import { CheckoutAddress } from '../../../services/api/order-api';
import { isApiError } from '../../../services/api/api-error';
import { useAddresses, useRemoveAddress, useSaveAddress } from '../../../services/addresses/address-queries';
import { colors } from '../../../theme';
import { addressStyles as s } from './address.styles';
import { DeliveryAddressForm } from './DeliveryAddressForm';
import { blankAddress as blank, addressFields, additionalAddressFields, addressFieldErrors, validateAddress } from './address-form';
import { HomeIcon } from '../../../features/home/HomeIcon';
import { useAppTheme } from '../../../theme/ThemeProvider';

const addressText = (address: Address) => [address.line1, address.locality, address.landmark,
  address.district, address.city, address.state, address.pincode].filter(Boolean).join(', ');
type Props = { open: boolean; onOpenChange: (open: boolean) => void; onReadyChange: (address: CheckoutAddress | null) => void };

export function CartAddressSection({ open, onOpenChange, onReadyChange }: Props) {
  const theme = useAppTheme();
  const { user } = useAuth();
  const saving = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const query = useAddresses();
  const save = useSaveAddress();
  const remove = useRemoveAddress();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [billingId, setBillingId] = useState<string | null>(null);
  const [sameBilling, setSameBilling] = useState(true);
  const [target, setTarget] = useState<'shipping' | 'billing'>('shipping');
  const [form, setForm] = useState<(AddressInput & { id?: string }) | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressInput, string>>>({});
  const [message, setMessage] = useState('');
  const formError = Object.values(errors).find(Boolean) || message;
  const addresses = query.data?.addresses ?? [];
  const selected = addresses.find((address) => address.id === selectedId) ?? addresses[0];
  const billing = sameBilling ? selected : addresses.find((address) => address.id === billingId);
  const pending = save.isPending || remove.isPending;
  function changeField(key: keyof AddressInput, value: string) {
    setForm((current) => current ? { ...current, [key]: value } : null);
    setErrors((current) => { const next = { ...current }; delete next[key]; return next; });
    setMessage('');
  }

  useEffect(() => {
    onReadyChange(selected && billing && !query.isError && !query.isPending
      ? { shippingAddressId: selected.id, billingAddressId: billing.id } : null);
  }, [selected, billing, onReadyChange, query.isError, query.isPending]);
  useEffect(() => { setSelectedId(null); setBillingId(null); setSameBilling(true); setForm(null); setMessage(''); }, [user?.id]);

  function openPicker(nextTarget: 'shipping' | 'billing') {
    setTarget(nextTarget); setForm(null); setMessage(''); onOpenChange(true);
    if (!query.isPending && !query.isError && !addresses.length) startForm();
  }
  function startForm(address?: Address) {
    setForm(address ? { ...blank, ...address, district: address.district ?? '' }
      : { ...blank, name: user?.fullName ?? '', phone: (user?.phone ?? '').slice(-10) });
    setErrors({}); setMessage('');
  }
  async function submit() {
    if (!form || saving.current || pending) return;
    const normalized = { ...form };
    for (const { key } of [...addressFields, ...additionalAddressFields]) normalized[key] = normalized[key].trim();
    const nextErrors = validateAddress(normalized);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setMessage(''); scroll.current?.scrollTo({ y: 0, animated: true }); return; }
    setMessage('');
    saving.current = true;
    try {
      const { address } = await save.mutateAsync(normalized);
      if (target === 'shipping') setSelectedId(address.id); else setBillingId(address.id);
      setForm(null); onOpenChange(false);
    } catch (error) {
      const fieldErrors = addressFieldErrors(isApiError(error) ? error.issues : undefined);
      setErrors(fieldErrors);
      setMessage(Object.keys(fieldErrors).length ? '' : isApiError(error) ? error.message : 'Could not save address. Please try again.');
      scroll.current?.scrollTo({ y: 0, animated: true });
    }
    finally { saving.current = false; }
  }
  async function deleteAddress(id: string) {
    setMessage('');
    try { await remove.mutateAsync(id); }
    catch (error) { setMessage(isApiError(error) ? error.message : 'Could not delete address.'); }
  }

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={query.isError ? 'Retry loading addresses' : 'Choose delivery address'} onPress={() => query.isError ? void query.refetch() : openPicker('shipping')} style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[s.pin, { backgroundColor: theme.colors.raised }]}><HomeIcon name="home" color={theme.colors.primary} size={23} /></View>
      <View style={s.flex}>
        <Text style={[s.eyebrow, { color: theme.colors.primary }]}>DELIVER TO</Text>
        {query.isPending ? <Text style={[s.compactCopy, { color: theme.colors.muted }]}>Loading saved addresses…</Text> : query.isError ? <Text style={s.error}>Could not load address - Retry</Text> : <>
          <Text numberOfLines={1} style={[s.compactTitle, { color: theme.colors.text }]}>{selected ? `${selected.label} - ${selected.name}` : 'Add delivery address'}</Text>
          {selected ? <Text numberOfLines={1} style={[s.compactCopy, { color: theme.colors.muted }]}>{[selected.locality, selected.district, selected.city, selected.pincode].filter(Boolean).join(', ')}</Text> : <Text style={[s.compactCopy, { color: theme.colors.muted }]}>Enter your area, house or landmark and PIN code</Text>}
        </>}
      </View>
      <Text style={[s.chevron, { color: theme.colors.primary }]}>{"\u203a"}</Text>
    </Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={() => { if (!pending) onOpenChange(false); }}>
      <SafeAreaView style={[s.modal, { backgroundColor: theme.colors.background }]}>
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.modalHeader, { backgroundColor: theme.colors.surface }]}><View style={s.flex}><Text style={[s.title, { color: theme.colors.text }]}>{form ? form.id ? 'Edit address' : 'Add a new address' : target === 'shipping' ? 'Choose delivery address' : 'Choose billing address'}</Text><Text style={[s.body, { color: theme.colors.muted }]}>{form ? 'A few details for a smooth delivery' : 'Select an address or add a new one'}</Text></View><Pressable accessibilityLabel="Close address form" disabled={pending} onPress={() => onOpenChange(false)} style={s.smallButton}><Text style={[s.link, { color: theme.colors.primary }]}>Close</Text></Pressable></View>
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.modalContent}>
            {remove.isPending && <AppLoader accessibilityLabel="Removing address" color={colors.primary} />}
            {!form && !!message && <Text accessibilityRole="alert" style={s.errorBanner}>{message}</Text>}
            {!form && target === 'billing' && <Pressable onPress={() => openPicker('shipping')} style={s.smallButton}><Text style={[s.link, { color: theme.colors.primary }]}>Back to delivery addresses</Text></Pressable>}
            {!form && (<View style={s.billing}>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: sameBilling }} onPress={() => setSameBilling(!sameBilling)} style={s.checkboxRow}><View style={[s.checkbox, sameBilling && s.checked]}><Text style={s.checkText}>{sameBilling ? '✓' : ''}</Text></View><Text style={[s.billingText, { color: theme.colors.text }]}>Billing address same as delivery</Text></Pressable>
        {!sameBilling && <Pressable onPress={() => openPicker('billing')} style={s.billingChoice}><Text style={[s.link, { color: theme.colors.primary }]}>{billing ? 'Change billing address' : '+ Add / select billing address'}</Text>{billing && <Text style={[s.body, { color: theme.colors.muted }]}>{billing.name} · {addressText(billing)}</Text>}</Pressable>}
      </View>)}
            {form ? <DeliveryAddressForm key={form.id ?? 'new'} form={form} errors={errors} pending={pending}
              onChange={changeField} /> : <>
              {query.isPending && <AppLoader color={colors.primary} />}
              {query.isError && <Pressable onPress={() => void query.refetch()}><Text style={s.error}>Unable to load addresses. Tap to retry.</Text></Pressable>}
              {addresses.map((address) => { const active = address.id === (target === 'shipping' ? selected?.id : billing?.id); return <View key={address.id} style={[s.savedCard, { backgroundColor: theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border }]}><Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} disabled={pending} onPress={() => { if (target === 'shipping') setSelectedId(address.id); else setBillingId(address.id); onOpenChange(false); }}><View style={s.heading}><Text style={[s.title, { color: theme.colors.text }]}>{address.name}</Text><Text style={s.tag}>{address.label}{active ? ' · Selected' : ''}</Text></View><Text style={[s.body, { color: theme.colors.muted }]}>{addressText(address)}</Text><Text style={[s.phone, { color: theme.colors.text }]}>+91 {address.phone}</Text></Pressable><View style={s.actions}><Pressable disabled={pending} onPress={() => startForm(address)} style={s.smallButton}><Text style={[s.link, { color: theme.colors.primary }]}>Edit</Text></Pressable><Pressable disabled={pending} onPress={() => void deleteAddress(address.id)} style={s.smallButton}><Text style={s.error}>Remove</Text></Pressable></View></View>; })}
              {!query.isPending && !query.isError && addresses.length === 0 && <Text style={s.body}>No saved addresses yet. Add your home, work or another delivery address.</Text>}
              <Pressable disabled={pending} onPress={() => startForm()} style={[s.addButton, theme.isDark && { borderColor: theme.colors.border }]}><Text style={[s.link, { color: theme.colors.primary }]}>+ Add new address</Text></Pressable>
            </>}
          </ScrollView>
          {form && <View style={[s.formFooter, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            {!!formError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.errorBanner}>{formError}</Text>}
            <Pressable disabled={pending} onPress={() => void submit()} style={[s.primaryButton, pending && { opacity: 0.6 }]}>{pending ? <AppLoader color="white" /> : <Text style={s.primaryText}>Save & use this address</Text>}</Pressable><Pressable disabled={pending} onPress={() => { setForm(null); setMessage(''); }} style={s.smallButton}><Text style={[s.link, { color: theme.colors.primary }]}>Back to saved addresses</Text></Pressable></View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </>;
}
