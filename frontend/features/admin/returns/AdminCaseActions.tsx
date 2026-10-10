import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAdminConfirmation } from '../components/useAdminConfirmation';
import { useReturnAction } from '../../returns/return-api';
import { AdminAction, requestKey, ReturnCase } from '../../returns/return-types';
import { ActionButton, Choices, Field } from '../../returns/ReturnControls';
import { ReturnPhotos } from '../../returns/ReturnPhotos';
import { rs as s } from '../../returns/return.styles';
import { actionsFor, AdminActionName, inspectionItems, isoDate, localDate } from './admin-action-model';

export function AdminCaseActions({ record }: { record: ReturnCase }) {
  const actions = actionsFor(record);
  const [selected, setSelected] = useState<AdminActionName>('approve');
  const action = actions.some((item) => item.value === selected) ? selected : actions[0]?.value;
  const [note, setNote] = useState('');
  const [start, setStart] = useState(localDate(new Date(Date.now() + 86400000)));
  const [end, setEnd] = useState(localDate(new Date(Date.now() + 90000000)));
  const [dueAt, setDueAt] = useState(localDate(new Date(Date.now() + 172800000)));
  const [mode, setMode] = useState<'pickup' | 'dropoff'>('pickup');
  const [contact, setContact] = useState('');
  const [reference, setReference] = useState('');
  const [instructions, setInstructions] = useState('');
  const [carrier, setCarrier] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sellable, setSellable] = useState<Record<number, string>>({});
  const [amount, setAmount] = useState(String(record.amount));
  const [photos, setPhotos] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const mutation = useReturnAction(record, true);
  const key = useRef(requestKey());
  const lock = useRef(false);
  const confirmation = useAdminConfirmation();
  if (!action) return confirmation.dialog;
  const requiresConfirmation = ['refund_complete', 'dispatch_exchange', 'schedule', 'complete_exchange', 'picked_up', 'received'].includes(action);
  function build(): AdminAction {
    const base = { version: record.version, clientKey: key.current, note: note.trim() };
    if (action === 'schedule' && [contact, reference, instructions].some((value) => value.trim().length < 3))
      throw new Error('Add a collection contact, booking reference and packing instructions (at least 3 characters each).');
    if (action === 'inspection_pass' && (!Number.isInteger(Number(quantity)) || Number(quantity) < 1))
      throw new Error('Enter the actual number of items received.');
    if (action === 'refund_complete' && (Number(amount) !== record.amount || reference.trim().length < 6))
      throw new Error(`Enter the full refund amount (${record.amount}) and a receipt reference of at least 6 characters.`);
    if (action === 'dispatch_exchange' && (carrier.trim().length < 2 || reference.trim().length < 3))
      throw new Error('Enter the delivery partner and replacement tracking reference.');
    if (action === 'ask_information') return { ...base, action, dueAt: isoDate(dueAt) };
    if (action === 'schedule') return { ...base, action, acceptAddressChange: confirmed,
      pickup: { mode, start: isoDate(start), end: isoDate(end), contact: contact.trim(), reference: reference.trim(), instructions: instructions.trim() } };
    if (action === 'inspection_pass') return { ...base, action, receivedQuantity: Number(quantity),
      restockItems: inspectionItems(record, sellable) };
    if (action === 'inspection_dispute') return { ...base, action, photoIds: photos };
    if (action === 'refund_complete') return { ...base, action, amount: Number(amount), reference: reference.trim(),
      method: record.refundMethod!, paymentVerified: true };
    if (action === 'dispatch_exchange') return { ...base, action, reference: reference.trim(), carrier: carrier.trim(), stockConfirmed: true };
    return { ...base, action };
  }
  async function submit(input: AdminAction) {
    if (lock.current) return;
    lock.current = true; setError('');
    try {
      await mutation.mutateAsync(input);
      key.current = requestKey(); setNote(''); setPhotos([]); setConfirmed(false); setReference(''); mutation.reset();
      setQuantity(''); setSellable({});
    }
    finally { lock.current = false; }
  }
  return <View style={s.card}><Text style={s.heading}>Manage request</Text>
    <Choices value={action} values={actions} disabled={mutation.isPending || photoBusy}
      onChange={(value) => { setSelected(value); setConfirmed(false); setError(''); mutation.reset(); }} />
    <Field label="Message for customer / action notes" value={note} onChange={setNote} multiline disabled={mutation.isPending} />
    {action === 'ask_information' && <Field label="Reply requested by (YYYY-MM-DD HH:mm, local time)" value={dueAt} onChange={setDueAt} />}
    {action === 'schedule' && <>
      <Choices value={mode} onChange={setMode} values={[{ value: 'pickup', label: 'Pickup' }, { value: 'dropoff', label: 'Agreed drop-off' }]} />
      <Field label="Window start (YYYY-MM-DD HH:mm, local time)" value={start} onChange={setStart} />
      <Field label="Window end (YYYY-MM-DD HH:mm, local time)" value={end} onChange={setEnd} />
      <Field label="Collection contact" value={contact} onChange={setContact} maxLength={120} />
      <Field label="Booking / arrangement reference" value={reference} onChange={setReference} maxLength={100} />
      <Field label="Packing and collection instructions" value={instructions} onChange={setInstructions} multiline maxLength={500} />
    </>}
    {action === 'approve' && record.preference === 'exchange' &&
      <Text style={s.muted}>Approval reserves the requested replacement size and color.</Text>}
    {action === 'inspection_pass' && <>
      <Field label="Actual received quantity" value={quantity} onChange={setQuantity} numeric maxLength={4} disabled={mutation.isPending} />
      <Text style={s.muted}>Return only inspected, sellable units to stock. Enter 0 for damaged, wrong or unsellable items.</Text>
      {record.items.map((item) => <Field key={item.index}
        label={`${item.name}${[item.color, item.size].filter(Boolean).length ? ` (${[item.color, item.size].filter(Boolean).join(' / ')})` : ''}: sellable quantity (0–${item.quantity})`}
        value={sellable[item.index] ?? ''} onChange={(value) => setSellable((current) => ({ ...current, [item.index]: value }))}
        numeric maxLength={2} disabled={mutation.isPending} />)}
    </>}
    {action === 'inspection_dispute' && <><Text style={s.muted}>Add at least one inspection photo.</Text>
      <ReturnPhotos orderId={record.orderId} ids={photos} onChange={setPhotos} onBusy={setPhotoBusy} disabled={mutation.isPending} /></>}
    {action === 'refund_complete' && <>
      <Text style={s.muted}>Customer-selected method: {record.refundMethod?.toUpperCase()}. Record only after the refund was actually made.</Text>
      <Field label="Actual refunded amount" value={amount} onChange={setAmount} numeric />
      <Field label="Refund / cash receipt reference" value={reference} onChange={setReference} maxLength={100} />
    </>}
    {action === 'dispatch_exchange' && <>
      <Field label="Carrier / delivery partner" value={carrier} onChange={setCarrier} maxLength={100} />
      <Field label="Replacement tracking / dispatch reference" value={reference} onChange={setReference} maxLength={100} />
    </>}
    {requiresConfirmation && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }}
      disabled={mutation.isPending} onPress={() => setConfirmed(!confirmed)} style={[s.secondary, confirmed && s.selected]}>
      <Text style={s.text}>{confirmed ? '✓ ' : '□ '}{action === 'schedule' ? 'Address and arrangement confirmed with the customer; booking is ready.'
        : action === 'refund_complete' ? 'Payment receipt verified and refund actually completed.'
          : action === 'dispatch_exchange' ? 'Correct replacement stock confirmed and shipment actually dispatched.'
            : 'This collection / receipt / delivery actually took place.'}</Text>
    </Pressable>}
    {(error || mutation.isError) && <Text accessibilityRole="alert" style={s.error}>{error || mutation.error?.message}</Text>}
    <ActionButton label="Confirm update" pending={mutation.isPending}
      disabled={note.trim().length < 3 || photoBusy || (requiresConfirmation && !confirmed) || (action === 'inspection_dispute' && !photos.length)}
      onPress={() => {
        try {
          const input = build();
          confirmation.confirm({ title: actions.find((item) => item.value === action)?.label ?? 'Confirm update',
            message: 'This update and your message will be visible to the customer.', label: 'Confirm update', onConfirm: () => submit(input) });
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Please check the form.'); }
      }} />
    {confirmation.dialog}
  </View>;
}
