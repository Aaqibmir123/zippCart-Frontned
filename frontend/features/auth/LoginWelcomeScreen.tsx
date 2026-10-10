import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authColors } from './auth.styles';

export function LoginWelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return <SafeAreaView style={s.page}>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.banner}>
        <Text accessibilityRole="header" style={s.title}>Welcome to JhelumKart 👋</Text>
        <Text style={s.copy}>Your local shopping journey starts here.</Text>
      </View>

      <Pressable accessibilityRole="button" onPress={onContinue} style={s.button}>
        <Text style={s.buttonText}>Let’s Explore →</Text>
      </Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: authColors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 22, gap: 18 },
  banner: { minHeight: 196, justifyContent: 'center', padding: 24, borderRadius: 28, backgroundColor: '#EDF8ED',
    borderWidth: 1, borderColor: '#D8EEDB' },
  title: { color: authColors.ink, fontSize: 29, lineHeight: 37, fontWeight: '900', letterSpacing: -0.8 },
  copy: { color: authColors.muted, fontSize: 15, lineHeight: 23, marginTop: 12 },
  button: { minHeight: 58, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: authColors.green },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
