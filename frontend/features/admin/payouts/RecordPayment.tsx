import { AppLoader } from '../../../components/AppLoader';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminConfirmation } from '../components/useAdminConfirmation';
import { StoreEarning, usePayoutAccount } from '../../earnings/earnings-api';
import { AccountDetails } from '../../earnings/PayoutAccountCard';
import { cash } from '../../earnings/payout-format';
import { ps as s } from '../../earnings/payout.styles';
import { useRecordPayment } from './useRecordPayment';

export type PaymentTarget = { store: StoreEarning } | { orderId: string };
const payoutKey = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
  const random = Math.floor(Math.random() * 16);
  return (token === 'x' ? random : (random & 3) | 8).toString(16);
});
export function RecordPayment({ target, onClose }: { target: PaymentTarget; onClose: () => void }) {
  const payout = 'store' in target;
  const accountQuery = usePayoutAccount(true, payout ? target.store.storeId : undefined);
  const account = accountQuery.data?.account;
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState(payout ? (target.store.availablePaise / 100).toFixed(2) : '');
  const [confirmed, setConfirmed] = useState(false);
  const key = useRef(payoutKey());
  const mutation = useRecordPayment();
  const confirmation = useAdminConfirmation();
  const busy = mutation.isPending;
  const amountPaise = Math.round(Number(amount) * 100);
  const validAmount = /^\d+(\.\d{1,2})?$/.test(amount) && Number.isSafeInteger(amountPaise)
    && amountPaise > 0 && (!payout || amountPaise <= target.store.availablePaise);
  const disabled = busy || !confirmed || reference.trim().length < 6
    || (payout && (!validAmount || !account || accountQuery.isError || accountQuery.isFetching));
  function submit() {
    if (disabled) return;
    confirmation.confirm({ title: payout ? `Record ${cash(amountPaise)} payout?` : 'Verify collected payment?',
      message: payout ? `${target.store.name} · ${reference.trim()}. This records your completed transfer.`
        : `Order #${target.orderId.slice(-8)} · Mark the full payment as collected.`,
      label: 'Confirm record', onDone: onClose,
      onConfirm: async () => {
        await mutation.mutateAsync(payout && account
          ? { storeId: target.store.storeId, clientKey: key.current, reference: reference.trim(), method: account.method, amountPaise }
          : { orderId: 'orderId' in target ? target.orderId : '', reference: reference.trim() });
      },
    });
  }
  return <Modal visible animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Pressable disabled={busy} style={s.touch} onPress={onClose}><Text style={s.link}>Close</Text></Pressable>
        <Text style={s.title}>{payout ? 'Record seller payout' : 'Verify customer payment'}</Text>
        <Text style={s.text}>{payout ? `${target.store.name} · Ready ${cash(target.store.availablePaise)}` : `Order #${target.orderId.slice(-8).toUpperCase()}`}</Text>
        {payout && <>
          {accountQuery.isPending ? <AppLoader accessibilityLabel="Loading account" />
            : accountQuery.isError ? <Pressable onPress={() => void accountQuery.refetch()}><Text style={s.error}>Account unavailable. Tap to retry.</Text></Pressable>
            : account ? <AccountDetails account={account} /> : <Text style={s.error}>No payout account saved.</Text>}
          <Text style={s.text}>Amount transferred (₹)</Text>
          <TextInput accessibilityLabel="Payout amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={s.input} editable={!busy} />
          {!validAmount && <Text style={s.error}>Enter an amount up to {cash(target.store.availablePaise)}.</Text>}
        </>}
        <Text style={s.text}>{payout ? 'Transaction reference' : 'Collection receipt / transaction reference'}</Text>
        <TextInput accessibilityLabel="Transaction reference" value={reference} onChangeText={setReference} maxLength={100}
          autoCapitalize="characters" autoCorrect={false} style={s.input} editable={!busy} />
        <Pressable disabled={busy} accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }}
          onPress={() => setConfirmed(!confirmed)} style={s.card}>
          <Text style={s.text}>{confirmed ? '☑' : '☐'} {payout ? 'I transferred this amount to the saved account.' : 'The full customer payment has been collected.'}</Text>
        </Pressable>
        <Text style={s.muted}>This saves a record; it does not transfer money.</Text>
        <Pressable accessibilityRole="button" disabled={disabled} onPress={submit} style={[s.button, disabled && { opacity: 0.45 }]}>
          {busy ? <AppLoader color="#FFF" /> : <Text style={s.buttonText}>Review & record</Text>}
        </Pressable>
      </ScrollView>
      {confirmation.dialog}
    </SafeAreaView>
  </Modal>;
}
