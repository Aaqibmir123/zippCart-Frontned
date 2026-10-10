import { Text, View } from 'react-native';
import { Choices, Field } from './ReturnControls';
import { PayoutDraft } from './payout-model';
import { rs as s } from './return.styles';

export function RefundPayoutForm({ value, onChange, disabled = false }: {
  value: PayoutDraft; onChange: (value: PayoutDraft) => void; disabled?: boolean;
}) {
  const change = (key: keyof PayoutDraft, text: string) => onChange({ ...value, [key]: text });
  return <View style={[s.card, { backgroundColor: '#F8F4FF', borderColor: '#E2D3F9', borderWidth: 1 }]}>
    <Text style={s.heading}>Where should we send your refund?</Text>
    <Text style={s.muted}>Choose one method. Refund is sent after your return is approved and checked.</Text>
    <Choices value={value.method} disabled={disabled} onChange={(method) => onChange({ ...value, method })}
      values={[{ value: 'upi', label: 'UPI' }, { value: 'bank', label: 'Bank account' }]} />
    {value.method === 'upi' && <>
      <Field label="Your UPI ID" value={value.upiId} onChange={(text) => change('upiId', text.replace(/\s/g, ''))}
        maxLength={320} disabled={disabled} autoCapitalize="none" />
      <Text style={s.muted}>Example: yourname@okaxis. Find it in your UPI app under profile or bank details.</Text>
    </>}
    {value.method === 'bank' && <>
      <Field label="Account holder name" value={value.accountHolder} onChange={(text) => change('accountHolder', text)} maxLength={100} disabled={disabled} />
      <Field label="Account number" value={value.accountNumber} onChange={(text) => change('accountNumber', text)} numeric maxLength={18} disabled={disabled} secure />
      <Field label="Confirm account number" value={value.confirmAccount} onChange={(text) => change('confirmAccount', text)} numeric maxLength={18} disabled={disabled} />
      <Field label="IFSC code" value={value.ifsc} onChange={(text) => change('ifsc', text.toUpperCase())} maxLength={11} disabled={disabled} autoCapitalize="characters" />
      <Text style={s.muted}>Find the 11-character IFSC on your passbook or banking app. Example: SBIN0001234.</Text>
    </>}
    <Text style={s.muted}>Only refund details are needed. Never enter your UPI PIN, OTP or card details.</Text>
  </View>;
}
