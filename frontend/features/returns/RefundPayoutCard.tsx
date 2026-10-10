import { useState } from 'react';
import { Text, View } from 'react-native';
import { returnApi, useReturnAction } from './return-api';
import { closedStatuses, RefundPayout, requestKey, ReturnCase } from './return-types';
import { ActionButton } from './ReturnControls';
import { RefundPayoutForm } from './RefundPayoutForm';
import { buildPayout, emptyPayout } from './payout-model';
import { rs as s } from './return.styles';

export function RefundPayoutCard({ record, admin = false }: { record: ReturnCase; admin?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => emptyPayout(record.refundMethod === 'bank' ? 'bank' : 'upi'));
  const [revealed, setRevealed] = useState<RefundPayout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState(requestKey);
  const mutation = useReturnAction(record, false);
  if (record.preference !== 'refund') return null;
  async function reveal() {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const result = await returnApi.payout(record);
      if (!result.payout) setError('The customer has not added payout details yet. Ask them to use Refund details.');
      setRevealed(result.payout);
    } catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  }
  async function save() {
    setError('');
    try {
      await mutation.mutateAsync({ action: 'payout', version: record.version, clientKey: key,
        note: 'Refund details updated securely.', payout: buildPayout(draft) });
      setEditing(false); setDraft(emptyPayout()); setKey(requestKey());
    } catch (cause) { setError((cause as Error).message); }
  }
  return <View style={s.card}>
    <Text style={s.heading}>Refund details</Text>
    <Text style={record.payoutSummary ? s.text : s.error}>{record.payoutSummary || 'Payout details needed'}</Text>
    {admin ? <>
      {revealed ? <View style={{ gap: 8 }}>
        {revealed.method === 'upi' && <Text selectable style={s.text}>UPI ID: {revealed.upiId}</Text>}
        {revealed.method === 'bank' && <>
          <Text selectable style={s.text}>Account holder: {revealed.accountHolder}</Text>
          <Text selectable style={s.text}>Account number: {revealed.accountNumber}</Text>
          <Text selectable style={s.text}>IFSC: {revealed.ifsc}</Text>
        </>}
        <ActionButton label="Hide details" onPress={() => setRevealed(null)} />
      </View> : <ActionButton label="View payout details" pending={loading} onPress={() => void reveal()} />}
    </> : !closedStatuses.includes(record.status) && <>
      {editing ? <>
        <RefundPayoutForm value={draft} onChange={setDraft} disabled={mutation.isPending} />
        <ActionButton label="Save refund details" pending={mutation.isPending} onPress={() => void save()} />
        <ActionButton label="Cancel" disabled={mutation.isPending} onPress={() => { setEditing(false); setDraft(emptyPayout(record.refundMethod)); }} />
      </> : <ActionButton label={record.payoutSummary ? 'Change refund details' : 'Add refund details'} onPress={() => setEditing(true)} />}
    </>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}
