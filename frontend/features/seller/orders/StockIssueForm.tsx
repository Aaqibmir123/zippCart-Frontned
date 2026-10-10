import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, TextInput, View } from 'react-native';
import { sellerOrderApi, SellerOrder } from './seller-order-api';
import { ss as s } from '../seller.styles';

export function StockIssueForm({ order }: { order: SellerOrder }) {
  const [note, setNote] = useState('');
  const client = useQueryClient();
  const report = useMutation({ mutationFn: () => sellerOrderApi.reportStockIssue(order.id, note.trim()),
    onSuccess: () => client.invalidateQueries({ queryKey: ['seller-orders'] }) });
  if (!['placed', 'preparing', 'packed', 'ready_for_dispatch'].includes(order.status)) return null;
  return <View style={s.card}><Text style={s.title}>Report stock issue</Text>
    {order.stockIssue?.open ? <><Text style={s.danger}>{order.stockIssue.note}</Text><Text style={s.small}>Admin has been alerted. This order remains active; it will not be auto-cancelled.</Text></> : <>
      <Text style={s.small}>Tell admin which item cannot be fulfilled. Reporting keeps the order safe while the issue is reviewed.</Text>
      <TextInput accessibilityLabel="Stock issue details" value={note} onChangeText={setNote} multiline maxLength={500} placeholder="Item, size/color and issue" style={{ borderWidth: 1, borderColor: '#DDD', padding: 12, borderRadius: 10 }} />
      <Pressable disabled={note.trim().length < 5 || report.isPending} onPress={() => report.mutate()} style={s.button}><Text style={s.buttonText}>{report.isPending ? 'Reporting...' : 'Report to admin'}</Text></Pressable>
      {report.isError && <Text style={s.danger}>{report.error.message}</Text>}
    </>}
  </View>;
}
