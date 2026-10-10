import { createContext, ReactNode, useContext, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthBackdrop } from './AuthBackdrop';
import { a } from './auth.styles';

const AuthLayoutContext = createContext({ compact: false, showDecorations: true });
export const useAuthLayout = () => useContext(AuthLayoutContext);

export function AuthFrame({ children, onBack, backDisabled = false }: {
  children: ReactNode | ((layout: { compact: boolean }) => ReactNode); onBack?: () => void; backDisabled?: boolean;
}) {
  const [height, setHeight] = useState(0);
  const compact = height < 640;
  return <View style={a.page}>
    <StatusBar style="dark" />
    <AuthBackdrop />
    <SafeAreaView style={a.flex}>
      <KeyboardAvoidingView style={a.flex} enabled={Platform.OS === 'ios'} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={a.content} onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}>
          <View style={[a.top, compact && a.topCompact]}>
            {onBack && <Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={backDisabled}
              accessibilityState={{ disabled: backDisabled }} onPress={onBack} style={a.back}>
              <Text style={a.backText}>{'\u2039'}</Text>
            </Pressable>}
          </View>
          <AuthLayoutContext.Provider value={{ compact, showDecorations: height >= 850 }}>
            <View collapsable={false} style={[a.body, compact && a.bodyCompact]}>
              {typeof children === 'function' ? children({ compact }) : children}
            </View>
          </AuthLayoutContext.Provider>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>;
}
