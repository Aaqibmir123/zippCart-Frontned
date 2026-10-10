import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { useCountdown } from '../../hooks/useCountdown';
import { TrustFooter } from '../../features/auth/AuthArtwork';
import { AuthBrand } from '../../features/auth/AuthBrand';
import { AuthFrame } from '../../features/auth/AuthFrame';
import { AuthButton } from '../../features/auth/AuthButton';
import { OtpInput } from '../../features/auth/OtpInput';
import { a } from '../../features/auth/auth.styles';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/routes';
import { useRequestOtp, useVerifyOtp } from '../../services/auth/auth-mutations';
import { clearPendingLogout, markSessionMayExist } from '../../services/auth/session-storage';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;
export function OtpVerificationScreen({ navigation, route }: Props) {
  const { setUser } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resendAt, setResendAt] = useState(() => Date.now() + (route.params.delivery?.resendAfterSeconds ?? 45) * 1000);
  const seconds = useCountdown(resendAt);
  const lock = useRef(false);
  const verify = useVerifyOtp();
  const resend = useRequestOtp();
  const busy = verify.isPending || resend.isPending;
  async function submit() {
    if (lock.current || busy || !/^\d{6}$/.test(otp)) return;
    lock.current = true; setError(''); Keyboard.dismiss();
    try {
      const { user } = await verify.mutateAsync({ phone: route.params.phone, code: otp });
      try { await markSessionMayExist(); }
      catch { console.warn('[auth] session_marker_write_error'); }
      try { await clearPendingLogout(); }
      catch { console.warn('[auth] logout_marker_clear_error'); }
      setUser(user, true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not verify this code. Please try again.'); }
    finally { lock.current = false; }
  }
  async function sendAgain() {
    if (Date.now() < resendAt || busy || lock.current) return;
    lock.current = true; setError(''); setNotice('');
    try {
      const result = await resend.mutateAsync(route.params.phone);
      setResendAt(Date.now() + (result.resendAfterSeconds ?? 45) * 1000); setOtp('');
      setNotice('A new verification code was requested.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not resend the code. Please try again.'); }
    finally { lock.current = false; }
  }
  return <AuthFrame onBack={navigation.goBack} backDisabled={busy}>{({ compact }) => <>
    <AuthBrand />
    <View collapsable={false} style={a.form}>
    <Text style={[a.title, compact && a.titleCompact]}>Verify your number</Text>
    <Text style={[a.subtitle, compact && a.subtitleCompact, { marginBottom: 0 }]}>We sent a 6-digit code to</Text>
    <View style={a.phoneSummary}>
      <Text style={a.phoneSummaryText}>+91 {route.params.phone.slice(0, 5)} {route.params.phone.slice(5)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit mobile number" disabled={busy} onPress={navigation.goBack} style={a.linkButton}><Text style={a.link}>Edit</Text></Pressable>
    </View>
    <OtpInput value={otp} disabled={busy} onChange={(value) => { setOtp(value); setError(''); }} onSubmit={() => void submit()} />
    {!!error && <Text accessibilityRole="alert" style={[a.error, a.center, compact && a.errorCompact]}>{error}</Text>}
    <AuthButton label={verify.isPending ? 'Verifying...' : 'Verify OTP'} disabled={otp.length !== 6 || resend.isPending} pending={verify.isPending} onPress={() => void submit()} />
    <View style={[a.resendRow, compact && a.resendCompact]}>
      <Text style={a.hint}>Didn't receive the code?</Text>
      <Pressable accessibilityRole="button" disabled={!!seconds || busy} onPress={() => void sendAgain()} style={a.linkButton}>
        <Text style={a.link}>{resend.isPending ? 'Requesting...' : seconds > 0 ? `Resend in ${Math.floor(seconds / 60).toString().padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : 'Resend OTP'}</Text>
      </Pressable>
    </View>
    {!!notice && <Text accessibilityLiveRegion="polite" style={[a.hint, a.center]}>{notice}</Text>}
    </View>
    <TrustFooter />
  </>}</AuthFrame>;
}
