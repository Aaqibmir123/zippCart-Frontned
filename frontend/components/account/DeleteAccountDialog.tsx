import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '../../theme/ThemeProvider';
import { authApi } from '../../services/api/auth-api';

type Props = {
  visible: boolean;
  phone: string;
  onClose: () => void;
  onDeleted: () => void;
};

function maskedPhone(phone: string): string {
  return phone.length > 4 ? `${'•'.repeat(phone.length - 4)}${phone.slice(-4)}` : phone;
}

export function DeleteAccountDialog({ visible, phone, onClose, onDeleted }: Props) {
  const theme = useAppTheme();
  const [step, setStep] = useState<'intro' | 'verify'>('intro');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function close() {
    if (busy) return;
    setStep('intro');
    setCode('');
    setError('');
    onClose();
  }

  async function sendCode() {
    setBusy(true);
    setError('');
    try {
      await authApi.requestOtp(phone);
      setStep('verify');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send a verification code. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!/^\d{6}$/.test(code) || busy) return;
    setBusy(true);
    setError('');
    try {
      await authApi.deleteAccount(code);
      onDeleted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the account. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <Modal animationType="fade" onRequestClose={close} transparent visible={visible}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
      <Pressable accessibilityLabel="Close delete account dialog" disabled={busy} onPress={close} style={StyleSheet.absoluteFill} />
      <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={s.headingRow}>
          <View style={s.icon}><Text style={s.iconText}>!</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" disabled={busy} onPress={close} hitSlop={12} style={s.close}>
            <Text style={[s.closeText, { color: theme.colors.muted }]}>×</Text>
          </Pressable>
        </View>
        <Text style={[s.title, { color: theme.colors.text }]}>Delete your account?</Text>
        {step === 'intro' ? <>
          <Text style={[s.body, { color: theme.colors.muted }]}>
            Your profile, saved addresses, cart, favourites and sign-in sessions will be removed.
          </Text>
          <View style={s.notice}>
            <Text style={s.noticeTitle}>Before you continue</Text>
            <Text style={s.noticeBody}>Completed order records are kept for service records, with your personal details removed. Open orders or returns must be resolved first. Store accounts need support assistance.</Text>
          </View>
          <Text style={[s.body, { color: theme.colors.muted }]}>
            We’ll verify your phone number before permanently deleting this account.
          </Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void sendCode()} style={s.destructiveButton}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.destructiveText}>Continue to verification</Text>}
          </Pressable>
        </> : <>
          <Text style={[s.body, { color: theme.colors.muted }]}>Enter the six-digit code sent to +91 {maskedPhone(phone)} to confirm permanent deletion.</Text>
          <TextInput accessibilityLabel="Account deletion verification code" autoComplete="one-time-code" autoFocus
            editable={!busy} keyboardType="number-pad" maxLength={6} onChangeText={(value) => {
              setCode(value.replace(/\D/g, ''));
              setError('');
            }} placeholder="• • • • • •" placeholderTextColor={theme.colors.muted}
            style={[s.codeInput, { color: theme.colors.text, borderColor: theme.colors.border }]} value={code} />
          <Pressable accessibilityRole="button" disabled={busy || code.length !== 6} onPress={() => void deleteAccount()}
            style={[s.destructiveButton, (busy || code.length !== 6) && s.disabled]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.destructiveText}>Permanently delete account</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setStep('intro'); setCode(''); setError(''); }}>
            <Text style={[s.backText, { color: theme.colors.primary }]}>Back</Text>
          </Pressable>
        </>}
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={close} style={s.cancel}>
          <Text style={[s.cancelText, { color: theme.colors.text }]}>Keep my account</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#11182799', padding: 20 },
  card: { width: '100%', maxWidth: 430, borderWidth: 1, borderRadius: 26, padding: 22 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#FCEBED' },
  iconText: { color: '#B42332', fontSize: 24, fontWeight: '800' },
  close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 28, lineHeight: 30 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 14 },
  body: { fontSize: 14, lineHeight: 21, marginTop: 10 },
  notice: { borderRadius: 16, backgroundColor: '#FFF5F4', padding: 14, marginTop: 16 },
  noticeTitle: { color: '#8B2635', fontSize: 13, fontWeight: '800', marginBottom: 5 },
  noticeBody: { color: '#78444B', fontSize: 12, lineHeight: 18 },
  codeInput: { borderWidth: 1, borderRadius: 14, fontSize: 22, fontWeight: '700', letterSpacing: 8, marginTop: 20, padding: 14, textAlign: 'center' },
  destructiveButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B42332', borderRadius: 15, marginTop: 18, paddingHorizontal: 16, paddingVertical: 12 },
  disabled: { opacity: 0.55 },
  destructiveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  error: { color: '#B42332', fontSize: 13, lineHeight: 19, marginTop: 12 },
  backText: { fontSize: 14, fontWeight: '700', marginTop: 18, textAlign: 'center' },
  cancel: { alignItems: 'center', marginTop: 12, padding: 10 },
  cancelText: { fontSize: 14, fontWeight: '700' },
});
