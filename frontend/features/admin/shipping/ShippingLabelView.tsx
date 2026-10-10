import { BrandWordmark } from '../../../components/brand/BrandWordmark';
import { AppLoader } from '../../../components/AppLoader';
﻿import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import type Svg from 'react-native-svg';
import { ShippingLabel } from './admin-shipping-api';
import { createShareableLabelPdf } from './shipping-label-pdf';
import { money } from '../../../utils/money';

export function ShippingLabelView({ label, onClose }: { label: ShippingLabel; onClose: () => void }) {
  const qr = useRef<Svg | null>(null);
  const locked = useRef(false);
  const [busy, setBusy] = useState<'print' | 'share' | null>(null);
  const [error, setError] = useState('');
  function qrImage() {
    return new Promise<string>((resolve, reject) => {
      if (!qr.current) { reject(new Error('QR image is still loading. Please try again.')); return; }
      const timer = setTimeout(() => reject(new Error('Could not prepare the QR image. Please retry.')), 5000);
      try { qr.current.toDataURL((data) => { clearTimeout(timer); resolve(data); }, { width: 600, height: 600 }); }
      catch (cause) { clearTimeout(timer); reject(cause); }
    });
  }
  async function exportLabel(action: 'print' | 'share') {
    if (locked.current) return;
    locked.current = true; setBusy(action); setError('');
    try {
      if (action === 'share' && !await Sharing.isAvailableAsync()) throw new Error('Sharing is unavailable on this device. Use Print label to save a PDF.');
      const uri = await createShareableLabelPdf(label, await qrImage());
      if (action === 'share') await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share JhelumKart label' });
      else await Print.printAsync({ uri });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not prepare the label. Please retry.'); }
    finally { locked.current = false; setBusy(null); }
  }
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaProvider><SafeAreaView style={s.page}>
      <View style={s.top}><View><Text style={s.title}>Shipping label</Text><Text style={s.muted}>Preview · Print or share a PDF</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close shipping label" disabled={!!busy} onPress={onClose} style={s.close}><Text style={s.link}>Close</Text></Pressable></View>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <View style={s.label}>
          <BrandWordmark style={s.brand} /><Text style={s.muted}>Shop smart. Delivered with care.</Text>
          <View style={s.referenceRow}><View style={s.referenceCopy}><Text style={s.caption}>SHIPMENT REFERENCE</Text><Text selectable style={s.reference}>{label.reference}</Text><Text style={s.muted}>Order #{label.orderId.slice(-8).toUpperCase()}</Text><Text style={s.muted}>{new Date(label.orderDate).toLocaleDateString('en-IN')}</Text></View>
            <QRCode value={label.qrValue} size={96} quietZone={10} ecl="M" getRef={(value) => { qr.current = value; }} onError={() => setError('Could not render the label QR code. Reopen the label to retry.')} />
          </View>
          <Text style={s.caption}>DELIVER TO</Text><Text style={s.customer}>{label.customer.name}</Text><Text style={s.address}>{label.customer.address}</Text><Text selectable style={s.address}>Phone: {label.customer.phone}</Text>
          <View style={s.payment}><Text style={s.caption}>{label.payment}</Text><Text style={s.amount}>{label.payment === 'COD' ? `Collect ${money(label.collectAmount)}` : 'Prepaid'}</Text></View>
          <Text style={s.muted}>{label.packages} package(s) · {label.itemCount} item(s)</Text>
          {(label.items ?? []).map((item, index) => <View key={index} style={s.item}><View style={s.referenceCopy}><Text style={s.itemName}>{item.name}</Text><Text style={s.muted}>{[item.color, item.size].filter(Boolean).join(' / ')}</Text></View><Text style={s.itemName}>× {item.quantity}</Text></View>)}
          <Text style={s.footer}>Fulfilled by JhelumKart. Keep this label securely attached to the shipment.</Text>
        </View>
      </ScrollView>
      <View style={s.actions}><Pressable accessibilityRole="button" disabled={!!busy} style={[s.secondary, busy && s.disabled]} onPress={() => void exportLabel('share')}><Text style={s.link}>{busy === 'share' ? 'Preparing…' : 'Share PDF'}</Text></Pressable><Pressable accessibilityRole="button" disabled={!!busy} style={[s.primary, busy && s.disabled]} onPress={() => void exportLabel('print')}>{busy === 'print' ? <AppLoader color="#fff" /> : <Text style={s.primaryText}>Print label</Text>}</Pressable></View>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F3FA' }, scroll: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  top: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E8E2F0' },
  title: { fontSize: 20, fontWeight: '800', color: '#25334E' }, close: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }, link: { color: '#7139F5', fontWeight: '700' },
  label: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D5CFDF', borderRadius: 12, padding: 18 },
  brand: { color: '#7139F5', fontWeight: '900', fontSize: 28 }, muted: { color: '#6F7282', fontSize: 11, lineHeight: 17 },
  referenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E6E2ED', paddingVertical: 14, marginVertical: 18 },
  referenceCopy: { flex: 1, minWidth: 0 }, caption: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#73788A' }, reference: { fontSize: 16, color: '#25334E', fontWeight: '800', marginVertical: 6 },
  customer: { fontSize: 20, fontWeight: '800', color: '#25334E', marginTop: 8 }, address: { color: '#394152', fontSize: 14, lineHeight: 23, marginTop: 6 },
  payment: { backgroundColor: '#F2ECFF', borderWidth: 1, borderColor: '#DFD1FF', padding: 14, borderRadius: 8, marginVertical: 18 }, amount: { color: '#25334E', fontSize: 20, fontWeight: '800', marginTop: 4 },
  item: { flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderColor: '#ECE8F0', paddingVertical: 10 }, itemName: { color: '#25334E', fontSize: 13, fontWeight: '600' }, footer: { color: '#73788A', fontSize: 10, lineHeight: 16, marginTop: 20 },
  actions: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E8E2F0' },
  primary: { flex: 1, minHeight: 52, borderRadius: 12, backgroundColor: '#7139F5', alignItems: 'center', justifyContent: 'center' }, secondary: { flex: 1, minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: '#D5C8EF', alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.55 }, error: { backgroundColor: '#FFF0F0', padding: 12, color: '#B52D46', fontSize: 12 },
});
