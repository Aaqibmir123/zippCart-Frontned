import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Order } from '../../services/api/order-api';
import { money } from '../../utils/money';
import { useReturnMutation } from './return-api';
import { reasonLabels, requestKey, ReturnCase, ReturnReason, ReturnRequest } from './return-types';
import { ActionButton, Choices, Field } from './ReturnControls';
import { PickupAddressEditor, addressText, validAddress } from './PickupAddressEditor';
import { ReturnItemPicker, remainingQuantity, initialReturnItems } from './ReturnItemPicker';
import { ReturnPhotos } from './ReturnPhotos';
import { rs as s } from './return.styles';
import { RefundPayoutForm } from './RefundPayoutForm';
import { buildPayout, emptyPayout, maskedPayout } from './payout-model';
import { OrderFlowHeader } from '../orders/OrderFlowHeader';

const steps = ['Items & outcome', 'Reason & photos', 'Pickup & refund', 'Review request'];
export function ReturnRequestSheet({ order, cases, onClose, onOpenCase }: {
  order: Order; cases: ReturnCase[]; onClose: () => void; onOpenCase: (caseId: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [preference, setPreference] = useState<'refund' | 'exchange'>('refund');
  const [items, setItems] = useState<ReturnRequest['items']>(() => initialReturnItems(order, cases));
  const [reason, setReason] = useState<ReturnReason>('damaged');
  const [description, setDescription] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [pickupAddress, setPickupAddress] = useState({ ...order.shippingAddress });
  const [payout, setPayout] = useState(emptyPayout);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState<ReturnCase[] | null>(null);
  const key = useRef(requestKey());
  const submitting = useRef(false);
  const mutation = useReturnMutation(order.id);
  const scroll = useRef<ScrollView>(null);
  const busy = mutation.isPending || photoBusy;
  const requiredPhotos = ['damaged', 'wrong_item', 'not_as_described'].includes(reason);
  const amount = items.reduce((sum, item) => sum + order.items[item.index].price * item.quantity, 0);

  function close() {
    if (busy) return;
    if (completed) { onClose(); return; }
    Alert.alert('Leave this request?', 'Your draft will be cleared.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: onClose },
    ]);
  }
  function next() {
    setError('');
    if (step === 2 && preference === 'refund') {
      try { buildPayout(payout); } catch (cause) { return setError((cause as Error).message); }
    }
    if (step === 0 && (!items.length || items.some((item) => item.quantity > remainingQuantity(order, cases, item.index))))
      return setError('Select an available item and quantity.');
    if (step === 1 && requiredPhotos && photoIds.length < 1)
      return setError('Add one photo showing the issue.');
    if (step === 2 && !validAddress(pickupAddress)) return setError('Complete a valid pickup address and mobile number.');
    setStep(step + 1); scroll.current?.scrollTo({ y: 0, animated: true });
  }
  async function submit() {
    if (submitting.current || busy) return;
    submitting.current = true;
    try {
      const result = await mutation.mutateAsync({ clientKey: key.current, items, preference, reason,
        description: description.trim(), photoIds, pickupAddress,
        ...(preference === 'refund' ? { refundMethod: payout.method, payout: buildPayout(payout) } : {}) });
      setCompleted(result.cases);
    } catch { /* Retain the draft and idempotency key for retry. */ }
    finally { submitting.current = false; }
  }
  return <Modal visible animationType="slide" onRequestClose={close}>
    <SafeAreaView style={s.page}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <OrderFlowHeader title="Return / Exchange" onBack={close} disabled={busy}
        subtitle={completed ? 'Request submitted' : `Step ${step + 1} of 4 · ${steps[step]}`}>
        {!completed && <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 4, now: step + 1 }} style={s.steps}>
          {steps.map((label, index) => <View key={label} style={[s.stepTrack, index <= step && s.stepActive]} />)}
        </View>}
      </OrderFlowHeader>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        {completed ? <View style={s.card}><Text style={s.heading}>Request submitted</Text>
          <Text style={s.text}>Support will review your request. Follow progress, ask questions and see pickup updates in your conversation.</Text>
          {completed.map((record) => <View key={record.id} style={{ gap: 8 }}>
            <Text style={s.text}>{record.items.map((item) => item.name).join(', ')}</Text>
            <Text selectable style={s.muted}>{record.requestId}</Text>
            <ActionButton label="Open support conversation" onPress={() => onOpenCase(record.id)} />
          </View>)}
        </View> : <>
          {step === 0 && <>
            <Choices value={preference} values={[{ value: 'refund', label: 'Return for refund' }, { value: 'exchange', label: 'Exchange' }]} onChange={setPreference} />
            <ReturnItemPicker order={order} cases={cases} value={items} onChange={setItems} exchange={preference === 'exchange'} />
          </>}
          {step === 1 && <>
            <Choices value={reason} values={Object.entries(reasonLabels).map(([value, label]) => ({ value: value as ReturnReason, label }))} onChange={setReason} />
            <Pressable onPress={() => setShowNote(!showNote)}><Text style={s.link}>{showNote ? 'Hide note' : 'Add a note (optional)'}</Text></Pressable>
            {showNote && <Field label="Additional details (optional)" multiline value={description} onChange={setDescription} />}
            <View style={s.card}><Text style={s.heading}>Photos · up to 5</Text>
              <Text style={s.muted}>{requiredPhotos ? 'One clear photo of the issue is enough. You can add more if helpful.' : 'Photos are optional for this reason.'}</Text>
              <ReturnPhotos orderId={order.id} ids={photoIds} onChange={setPhotoIds} onBusy={setPhotoBusy} />
            </View>
          </>}
          {step === 2 && <>
            <PickupAddressEditor value={pickupAddress} onChange={setPickupAddress} />
            {preference === 'refund' && <RefundPayoutForm value={payout} onChange={setPayout} disabled={busy} />}
          </>}
          {step === 3 && <>
            <View style={s.card}><Text style={s.heading}>{preference === 'refund' ? 'Return for refund' : 'Exchange request'}</Text>
              {items.map((item) => <View key={item.index}><Text style={s.text}>{order.items[item.index].name} × {item.quantity}</Text>
                {preference === 'exchange' && <Text style={s.muted}>Replacement: {[item.exchangeColor, item.exchangeSize].filter(Boolean).join(' / ') || 'Same product'}</Text>}</View>)}
              <Text style={s.text}>Selected items: {money(amount)}</Text>
              {preference === 'refund' && <Text style={s.muted}>{maskedPayout(payout)} · Delivery charge is not included.</Text>}
              <Text style={s.text}>{reasonLabels[reason]}</Text><Text style={s.muted}>{description}</Text>
              <ReturnPhotos orderId={order.id} ids={photoIds} />
            </View>
            <View style={s.card}><Text style={s.heading}>Pickup address</Text><Text style={s.text}>{pickupAddress.name} · {pickupAddress.phone}</Text>
              <Text style={s.text}>{addressText(pickupAddress)}</Text></View>
            <Text style={s.muted}>Requests from different sellers are tracked separately. Submission does not book a pickup or issue a refund.</Text>
          </>}
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
          {mutation.isError && <Text accessibilityRole="alert" style={s.error}>{mutation.error.message}</Text>}
        </>}
      </ScrollView>
      {!completed && <View style={s.footer}>
        {step > 0 && <Pressable disabled={busy} onPress={() => { setStep(step - 1); setError(''); }}><Text style={s.link}>Back</Text></Pressable>}
        <ActionButton label={step === 3 ? 'Confirm & submit request' : 'Continue'} pending={mutation.isPending}
          disabled={photoBusy} onPress={step === 3 ? () => void submit() : next} />
      </View>}
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
