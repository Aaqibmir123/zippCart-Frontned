import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useReturnAction } from './return-api';
import { closedStatuses, CustomerAction, editableAddressStatuses, RefundPayout, requestKey, ReturnCase } from './return-types';
import { ActionButton, Choices, Field } from './ReturnControls';
import { PickupAddressEditor, validAddress } from './PickupAddressEditor';
import { rs as s } from './return.styles';
import { buildPayout, emptyPayout } from './payout-model';
import { RefundPayoutForm } from './RefundPayoutForm';

export function CustomerReturnActions({ record, onSaved }: { record: ReturnCase; onSaved?: () => void }) {
  type UpdateName = 'address' | 'reschedule' | 'cancel' | 'switch_refund';
  const [action, setAction] = useState<UpdateName>('address');
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState('');
  const [address, setAddress] = useState(record.pickupAddress);
  const [payout, setPayout] = useState(emptyPayout);
  const [error, setError] = useState('');
  const mutation = useReturnAction(record, false);
  const key = useRef(requestKey());
  const lock = useRef(false);
  const canAddress = editableAddressStatuses.includes(record.status) &&
    (record.status !== 'information_needed' || editableAddressStatuses.includes(record.resumeStatus!));
  const actions: { value: UpdateName; label: string }[] = [];
  if (canAddress) actions.push({ value: 'address', label: 'Update pickup address' });
  if (['pickup_pending', 'pickup_scheduled', 'pickup_failed'].includes(record.status)) actions.push({ value: 'reschedule', label: 'Request reschedule' });
  if (canAddress || record.status === 'pickup_scheduled') actions.push({ value: 'cancel', label: 'Cancel request' });
  if (record.preference === 'exchange' && ['under_review', 'pickup_pending', 'pickup_scheduled', 'pickup_failed', 'inspection', 'exchange_pending'].includes(record.status))
    actions.push({ value: 'switch_refund', label: 'Choose refund instead' });
  if (closedStatuses.includes(record.status) || !actions.length) return null;
  const selected = actions.some((item) => item.value === action) ? action : actions[0].value;
  const showsAddress = selected === 'address' || selected === 'reschedule';
  const disabled = note.trim().length < 3 || (showsAddress && !validAddress(address));

  async function submit() {
    if (lock.current || disabled) return;
    setError('');
    let refundPayout: RefundPayout | undefined;
    try { if (selected === 'switch_refund') refundPayout = buildPayout(payout); }
    catch (cause) { setError((cause as Error).message); return; }
    lock.current = true;
    const base = { clientKey: key.current, version: record.version, note: note.trim() };
    const input: CustomerAction = selected === 'address' || selected === 'reschedule' ? { ...base, action: selected, pickupAddress: address }
        : selected === 'switch_refund' ? { ...base, action: selected, refundMethod: payout.method, payout: refundPayout! } : { ...base, action: 'cancel' };
    try {
      await mutation.mutateAsync(input);
      key.current = requestKey(); setNote(''); setPayout(emptyPayout()); setExpanded(false); mutation.reset(); onSaved?.();
    }
    catch { /* Preserve the reply for retry. */ }
    finally { lock.current = false; }
  }
  return <View style={s.card}><Text style={s.heading}>Manage your request</Text>
    <ActionButton label={expanded ? 'Hide options' : 'Make a change'} disabled={mutation.isPending} onPress={() => setExpanded(!expanded)} />
    {expanded && <>
    <Choices value={selected} values={actions} onChange={setAction} disabled={mutation.isPending} />
    <Field label="Reason for this change" value={note} onChange={setNote} multiline disabled={mutation.isPending} />
    {showsAddress && <PickupAddressEditor value={address} onChange={setAddress} disabled={mutation.isPending} />}
    {selected === 'switch_refund' && <RefundPayoutForm value={payout} onChange={setPayout} disabled={mutation.isPending} />}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {mutation.isError && <Text accessibilityRole="alert" style={s.error}>{mutation.error.message}</Text>}
    <ActionButton label="Send update" pending={mutation.isPending} disabled={disabled} onPress={() => {
      if (selected === 'cancel' || selected === 'switch_refund') Alert.alert('Confirm update',
        selected === 'cancel' ? 'Cancel this return request?' : 'Change this exchange to a refund?',
        [{ text: 'Back', style: 'cancel' }, { text: 'Confirm', onPress: () => void submit() }]);
      else void submit();
    }} />
    </>}
  </View>;
}
