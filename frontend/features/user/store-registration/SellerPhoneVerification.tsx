import { AppLoader } from '../../../components/AppLoader';
import { useState } from 'react';
import { useCountdown } from '../../../hooks/useCountdown';
import { useMutation } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { FormField } from './FormField';
import { storeApi } from './store-api';
import { s } from './registration.styles';

export function SellerPhoneVerification({ phone, loginPhone, verified, onVerified }: {
  phone: string; loginPhone?: string; verified: boolean;
  onVerified: (proof: { phone: string; ownerPhoneProof: string }) => void;
}) {
  const [code, setCode] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const seconds = useCountdown(resendAt, !verified && /^[6-9]\d{9}$/.test(phone));
  const send = useMutation({ mutationFn: () => storeApi.requestOwnerOtp(phone), retry: false,
    onSuccess: (receipt) => { setResendAt(Date.now() + receipt.resendAfterSeconds * 1000); setCode(''); check.reset(); } });
  const check = useMutation({ mutationFn: () => storeApi.verifyOwnerOtp(phone, code), retry: false, gcTime: 0,
    onSuccess: onVerified });
  if (!/^[6-9]\d{9}$/.test(phone)) return null;
  if (verified) return <View style={s.card}><Text style={s.link}>
    {phone === loginPhone ? 'Your login number is verified.' : 'Seller number verified.'}
  </Text></View>;
  const busy = send.isPending || check.isPending;
  return <View style={s.card}>
    <Text style={s.sectionTitle}>Verify seller number</Text>
    <Text style={s.hint}>The store will belong to +91 {phone}. Your current login stays unchanged.</Text>
    <Pressable accessibilityRole="button" disabled={busy || seconds > 0}
      onPress={() => { if (!busy && Date.now() >= resendAt) send.mutate(); }} style={s.secondary}>
      {send.isPending ? <AppLoader /> : <Text style={s.link}>
        {seconds ? `Resend in ${seconds}s` : send.isSuccess ? 'Resend OTP' : 'Send OTP'}
      </Text>}
    </Pressable>
    {send.isSuccess && <>
      <Text style={s.hint}>{send.data.message}</Text>
      <FormField label="Seller number OTP" placeholder="6-digit code" value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
      <Pressable accessibilityRole="button" disabled={busy || code.length !== 6}
        onPress={() => check.mutate()} style={s.secondary}>
        {check.isPending ? <AppLoader /> : <Text style={s.link}>Verify number</Text>}
      </Pressable>
    </>}
    {(send.isError || check.isError) && <Text accessibilityRole="alert" style={s.error}>
      {check.error?.message || send.error?.message}
    </Text>}
  </View>;
}
