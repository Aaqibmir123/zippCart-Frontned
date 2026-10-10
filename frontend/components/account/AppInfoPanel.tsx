import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import appConfig from '../../app.json';
import { BrandMark } from '../BrandMark';

export function AppInfoPanel() {
  return (
    <View style={s.panel}>
      <LinearGradient colors={['#EAE4F5', '#F8F6FC']} style={s.hero}>
        <View style={s.logo}><BrandMark compact /></View>
        <Text style={s.name}>{appConfig.expo.name}</Text>
        <Text style={s.tagline}>Little finds. Big joy.</Text>
        <View style={s.badge}><Text style={s.version}>Version {appConfig.expo.version}</Text></View>
      </LinearGradient>
      <View style={s.card}>
        <Text style={s.heading}>A little more everyday.</Text>
        <Text style={s.copy}>Discover products, keep your favourites close and bring your next good find home with JhelumKart.</Text>
      </View>
      <View style={s.note}>
        <Text style={s.heading}>Explore at your pace</Text>
        <Text style={s.copy}>Sign in with your mobile number to shop, save favourites and track your orders.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { padding: 18, gap: 16 },
  hero: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 18, borderRadius: 26 },
  logo: { padding: 18, backgroundColor: '#FFFFFFB0', borderRadius: 25, marginBottom: 18 },
  name: { color: '#354159', fontSize: 29, fontWeight: '800', letterSpacing: -1 },
  tagline: { color: '#8A7B9F', fontSize: 13, marginTop: 7 },
  badge: { paddingHorizontal: 13, paddingVertical: 8, backgroundColor: '#FFFFFF', borderRadius: 12, marginTop: 20 },
  version: { color: '#74658B', fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: 'white', borderRadius: 21, padding: 20, borderWidth: 1, borderColor: '#EAE6F2' },
  heading: { color: '#354159', fontSize: 15, fontWeight: '700' },
  copy: { color: '#838092', fontSize: 13, lineHeight: 22, marginTop: 9 },
  note: { padding: 20, backgroundColor: '#EFF2F4', borderRadius: 21 },
});
