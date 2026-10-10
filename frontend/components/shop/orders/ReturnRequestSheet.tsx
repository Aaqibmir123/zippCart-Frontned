import { AppLoader } from '../../AppLoader';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Order, ReturnRequestInput } from '../../../services/api/order-api';
import { useRequestReturn } from '../../../services/orders/order-queries';
import { colors } from '../../../theme';

const reasons: { value: ReturnRequestInput['reason']; label: string }[] = [
  { value: 'damaged', label: 'Damaged or defective' }, { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'not_as_described', label: 'Not as described' }, { value: 'size_fit', label: 'Size or fit issue' },
  { value: 'other', label: 'Other reason' },
];

export function ReturnRequestSheet({ order, onClose }: { order: Order; onClose: () => void }) {
  const [preference, setPreference] = useState<ReturnRequestInput['preference'] | null>(null);
  const [reason, setReason] = useState<ReturnRequestInput['reason'] | null>(null);
  const [description, setDescription] = useState('');
  const mutation = useRequestReturn();
  const valid = !!preference && !!reason && description.trim().length >= 10;
  async function submit() {
    if (!preference || !reason || description.trim().length < 10) return;
    try { await mutation.mutateAsync({ id: order.id, input: { preference, reason, description: description.trim() } }); onClose(); }
    catch { /* Keep selections and show the server error for retry. */ }
  }
  return <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
    <SafeAreaView style={s.page}>
      <View style={s.header}><View><Text style={s.kicker}>ORDER #{order.id.slice(-8).toUpperCase()}</Text>
        <Text style={s.title}>Request a return</Text></View>
        <Pressable accessibilityRole="button" onPress={onClose} style={s.close}><Text style={s.closeText}>Close</Text></Pressable></View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.sectionTitle}>What would you prefer?</Text>
        <View style={s.choices}>{([
          { value: 'refund', title: 'Return for refund', detail: 'Return the item and request your money back' },
          { value: 'exchange', title: 'Exchange item', detail: 'Request a replacement after review' },
        ] as const).map((choice) => <Pressable key={choice.value} accessibilityRole="radio"
          accessibilityState={{ checked: preference === choice.value }} onPress={() => setPreference(choice.value)}
          style={[s.choice, preference === choice.value && s.selected]}>
          <View style={[s.radio, preference === choice.value && s.radioSelected]} />
          <View style={s.flex}><Text style={s.choiceTitle}>{choice.title}</Text><Text style={s.choiceDetail}>{choice.detail}</Text></View>
        </Pressable>)}</View>
        <Text style={s.sectionTitle}>Why are you returning it?</Text>
        <View style={s.reasons}>{reasons.map((item) => <Pressable key={item.value} accessibilityRole="radio"
          accessibilityState={{ checked: reason === item.value }} onPress={() => setReason(item.value)}
          style={[s.reason, reason === item.value && s.reasonSelected]}>
          <Text style={[s.reasonText, reason === item.value && s.reasonTextSelected]}>{item.label}</Text>
        </Pressable>)}</View>
        <Text style={s.sectionTitle}>Tell us what happened</Text>
        <TextInput accessibilityLabel="Return details" multiline maxLength={500} value={description}
          onChangeText={setDescription} placeholder="Describe the issue in at least 10 characters"
          placeholderTextColor="#9AA8A1" style={s.input} />
        <Text style={s.count}>{description.trim().length}/500 characters</Text>
        <View style={s.notice}><Text style={s.noticeText}>This sends a request for admin review. Refunds and exchanges are not automatic.</Text></View>
        {!!mutation.error && <Text accessibilityRole="alert" style={s.error}>{mutation.error.message}</Text>}
      </ScrollView>
      <View style={s.footer}><Pressable accessibilityRole="button" disabled={mutation.isPending || !valid}
        onPress={() => void submit()} style={[s.button, (!valid || mutation.isPending) && s.disabled]}>
        {mutation.isPending ? <AppLoader color="#fff" /> : <Text style={s.buttonText}>Submit request</Text>}
      </Pressable></View>
    </SafeAreaView>
  </Modal>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F7F6' }, header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E4EBE6' },
  kicker: { color: '#71927E', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 5 },
  close: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#ECF2EE', borderRadius: 10 },
  closeText: { color: '#397551', fontSize: 12, fontWeight: '800' },
  content: { padding: 20, paddingBottom: 28, gap: 12 }, sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 7 },
  choices: { gap: 9 }, choice: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E0E9E3', borderRadius: 14, padding: 14 },
  selected: { borderColor: '#3E8460', backgroundColor: '#F1F8F2' }, flex: { flex: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#A7B8AC' },
  radioSelected: { borderWidth: 6, borderColor: '#3E8460' },
  choiceTitle: { color: '#2D4539', fontSize: 13, fontWeight: '800' },
  choiceDetail: { color: '#768A7B', fontSize: 11, marginTop: 4 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reason: { borderWidth: 1, borderColor: '#DDE7DF', backgroundColor: '#fff', borderRadius: 20,
    minHeight: 39, paddingHorizontal: 13, justifyContent: 'center' },
  reasonSelected: { borderColor: '#3E8460', backgroundColor: '#E7F3E9' },
  reasonText: { color: '#617468', fontSize: 11, fontWeight: '700' },
  reasonTextSelected: { color: '#2E7451' },
  input: { minHeight: 112, textAlignVertical: 'top', backgroundColor: '#fff', borderWidth: 1,
    borderColor: '#DDE7DF', borderRadius: 14, padding: 13, color: colors.ink, fontSize: 13 },
  count: { color: '#8CA095', fontSize: 10, textAlign: 'right', marginTop: -7 },
  notice: { backgroundColor: '#EAF2EC', borderRadius: 11, padding: 12 },
  noticeText: { color: '#557060', fontSize: 11, lineHeight: 17 },
  footer: { padding: 18, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E4EBE6' },
  button: { minHeight: 52, backgroundColor: '#2E6B57', borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '800' }, disabled: { opacity: 0.45 },
  error: { color: colors.error, fontSize: 12, lineHeight: 17 },
});
