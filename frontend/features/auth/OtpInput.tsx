import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { a } from './auth.styles';
import { useAuthLayout } from './AuthFrame';

export function OtpInput({ value, onChange, disabled, onSubmit }: {
  value: string; onChange: (value: string) => void; disabled: boolean; onSubmit: () => void;
}) {
  const { compact } = useAuthLayout();
  const [focused, setFocused] = useState(false);
  return <View style={[a.otpRow, compact && a.otpCompact]}>
    {Array.from({ length: 6 }, (_, index) => <View key={index} pointerEvents="none" accessible={false}
      style={[a.otpBox, focused && index === Math.min(value.length, 5) && a.otpFocused]}>
      {focused && index === value.length ? <View style={a.caret} /> : <Text style={a.digit}>{value[index] || ''}</Text>}
    </View>)}
    <TextInput accessibilityLabel="6-digit verification code" autoFocus value={value} editable={!disabled}
      onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))} maxLength={6}
      keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" caretHidden
      selectionColor="transparent" style={a.otpNative} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onSubmitEditing={onSubmit} />
  </View>;
}
