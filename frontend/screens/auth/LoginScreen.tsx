import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import { LegalLinks } from '../../components/auth/LegalLinks';
import { AuthStackParamList } from '../../navigation/routes';
import { useRequestOtp } from '../../services/auth/auth-mutations';
import { AuthFrame } from '../../features/auth/AuthFrame';
import { AuthBrand } from '../../features/auth/AuthBrand';
import { AuthButton } from '../../features/auth/AuthButton';
import { LoginArtwork, LoginBenefits } from '../../features/auth/AuthArtwork';
import { a } from '../../features/auth/auth.styles';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const mutation = useRequestOtp();
  async function submit() {
    if (lock.current) return;
    if (!/^[6-9]\d{9}$/.test(phone)) { setError('Enter a valid 10-digit Indian mobile number.'); return; }
    lock.current = true; setError('');
    Keyboard.dismiss();
    try {
      const delivery = await mutation.mutateAsync(phone);
      navigation.navigate('OtpVerification', { phone, delivery });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not request a code. Please try again.'); }
    finally { lock.current = false; }
  }
  return <AuthFrame>{({ compact }) => <>
    <AuthBrand />
    <View collapsable={false} style={a.form}>
    <Text style={[a.title, compact && a.titleCompact]}>Welcome back</Text>
    <Text style={[a.subtitle, compact && a.subtitleCompact]}>Enter your phone number to continue</Text>
    <View style={[a.phoneRow, compact && a.phoneRowCompact]}>
      <View style={a.dialCode}><Text>{'\uD83C\uDDEE\uD83C\uDDF3'}</Text><Text style={a.dialText}>+91</Text></View>
      <TextInput accessibilityLabel="Indian mobile number" editable={!mutation.isPending} keyboardType="phone-pad"
        autoComplete="tel-national" maxLength={10} value={phone} onChangeText={(value) => { setPhone(value.replace(/\D/g, '')); setError(''); }}
        placeholder="98765 43210" placeholderTextColor="#AAB1B4" style={[a.phone, compact && a.phoneCompact]} onSubmitEditing={() => void submit()} />
    </View>
    {!!error && <Text accessibilityRole="alert" style={[a.error, a.center, compact && a.errorCompact]}>{error}</Text>}
    <AuthButton label={mutation.isPending ? 'Requesting OTP...' : 'Continue'} pending={mutation.isPending} onPress={() => void submit()} />
    </View>
    <LoginBenefits />
    <LoginArtwork />
    <Text style={[a.legalHint, compact && a.legalHintCompact]}>By continuing, you agree to our</Text>
    <LegalLinks disabled={mutation.isPending} onTerms={() => navigation.navigate('TermsAndConditions')} onPrivacy={() => navigation.navigate('PrivacyPolicy')} />
  </>}</AuthFrame>;
}
