import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { supportContact, supportPhone } from '../../constants/support';

export function SupportPanel() {
  const [error, setError] = useState('');
  async function openContact(url: string) {
    setError('');
    try { await Linking.openURL(url); }
    catch { setError('Could not open this app. Copy the contact details below to get in touch.'); }
  }

  return (
    <View style={s.panel}>
      <LinearGradient colors={['#E8E2F5', '#F4EFF9']} style={s.hero}>
        <View style={s.mark}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M4 13v-1a8 8 0 0 1 16 0v1M2 12h4v7H2v-7Zm16 0h4v7h-4v-7Zm2 7v2h-7" stroke="#71618F" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <Text style={s.title}>Let’s talk.</Text>
        <Text style={s.copy}>Questions, feedback or a little help with JhelumKart.</Text>
      </LinearGradient>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <View style={s.card}>
        <Text style={s.label}>EMAIL US</Text>
        <Text selectable style={s.value}>{supportContact.email}</Text>
        <Pressable accessibilityRole="button" onPress={() => void openContact(`mailto:${supportContact.email}`)} style={({ pressed }) => [s.button, pressed && s.pressed]}>
          <Text style={s.buttonText}>Write an email  {'\u2197'}</Text>
        </Pressable>
      </View>
      <View style={s.card}>
        <Text style={s.label}>PHONE</Text>
        <Text selectable style={s.value}>{supportPhone ? `+91 ${supportPhone.slice(3)}` : supportContact.phone.trim()}</Text>
        {supportPhone && <Pressable accessibilityRole="button" onPress={() => void openContact(`tel:${supportPhone}`)} style={({ pressed }) => [s.button, pressed && s.pressed]}>
          <Text style={s.buttonText}>Call support  {'\u2197'}</Text>
        </Pressable>}
      </View>
      <View style={s.locationCard}>
        <Text style={s.label}>FIND US IN</Text>
        <Text style={s.location}>{supportContact.location}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { padding: 18, gap: 14 },
  hero: { borderRadius: 24, padding: 22 },
  mark: { backgroundColor: '#FFFFFFA0', width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { color: '#354159', fontSize: 27, fontWeight: '800' },
  copy: { color: '#7B748C', fontSize: 13, lineHeight: 21, marginTop: 8 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 19, borderWidth: 1, borderColor: '#EAE6F2' },
  label: { color: '#9484AA', fontSize: 10, letterSpacing: 1.5, fontWeight: '800' },
  value: { color: '#354159', fontSize: 15, fontWeight: '600', lineHeight: 24, marginTop: 9 },
  button: { backgroundColor: '#F0ECF7', minHeight: 44, borderRadius: 12, marginTop: 15, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#71618F', fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.6 },
  locationCard: { padding: 19, backgroundColor: '#EFF2F4', borderRadius: 20 },
  location: { color: '#727A89', fontSize: 13, lineHeight: 21, marginTop: 9 },
  error: { color: '#B35972', fontSize: 12, lineHeight: 19 },
});
