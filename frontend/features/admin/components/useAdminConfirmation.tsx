import { AppLoader } from '../../../components/AppLoader';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Confirmation = { title: string; message: string; label: string; destructive?: boolean;
  onConfirm: () => Promise<unknown>; onDone?: () => void };
export function useAdminConfirmation() {
  const [request, setRequest] = useState<Confirmation | null>(null);
  const [state, setState] = useState<'confirm' | 'pending' | 'success'>('confirm');
  const [error, setError] = useState('');
  const busy = useRef(false);
  function close() {
    if (busy.current) return;
    setRequest(null);
    if (state === 'success') request?.onDone?.();
  }
  async function submit() {
    if (!request || busy.current) return;
    busy.current = true; setState('pending'); setError('');
    try { await request.onConfirm(); setState('success'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Update failed. Please retry.'); setState('confirm'); }
    finally { busy.current = false; }
  }
  return {
    confirm: (next: Confirmation) => { if (!busy.current) { setState('confirm'); setError(''); setRequest(next); } },
    dialog: <Modal visible={!!request} transparent animationType="fade" onRequestClose={close}>
      <SafeAreaView style={s.overlay}><View accessibilityViewIsModal style={s.card}>
        <View style={[s.icon, state === 'success' && s.success]}><Text style={s.symbol}>{state === 'success' ? '✓' : '!'}</Text></View>
        <Text accessibilityRole="header" style={s.title}>{state === 'success' ? 'Update saved' : request?.title}</Text>
        <Text style={s.copy}>{state === 'success' ? 'The latest status is now available.' : request?.message}</Text>
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        {state === 'success' ? <Pressable accessibilityRole="button" onPress={close} style={s.primary}><Text style={s.white}>Done</Text></Pressable>
          : <View style={s.row}>
            <Pressable accessibilityRole="button" disabled={state === 'pending'} onPress={close} style={s.cancel}><Text style={s.copy}>Go back</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ busy: state === 'pending', disabled: state === 'pending' }} disabled={state === 'pending'}
              onPress={() => void submit()} style={[s.primary, { flex: 1 }, request?.destructive && { backgroundColor: '#B23C57' }]}>
              {state === 'pending' ? <AppLoader color="#FFF" /> : <Text style={s.white}>{request?.label}</Text>}
            </Pressable>
          </View>}
      </View></SafeAreaView>
    </Modal>,
  };
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(28,16,44,0.5)', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: '#FFF', borderRadius: 24, padding: 24, gap: 18 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EFE6FF', alignItems: 'center', justifyContent: 'center' },
  success: { backgroundColor: '#DFF6E9' }, symbol: { color: '#6337A8', fontSize: 26, fontWeight: '800' },
  title: { color: '#2C1C40', fontSize: 21, fontWeight: '800' }, copy: { color: '#6E607E', fontSize: 14, lineHeight: 22 },
  error: { color: '#B23C57', fontSize: 13 }, row: { flexDirection: 'row', gap: 12 },
  cancel: { flex: 1, backgroundColor: '#F3EFF8', borderRadius: 13, padding: 14, alignItems: 'center' },
  primary: { backgroundColor: '#7638D4', borderRadius: 13, padding: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  white: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
