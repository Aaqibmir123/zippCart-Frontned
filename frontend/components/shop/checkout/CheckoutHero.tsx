import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export function CheckoutHero() {
  return <View style={s.hero}>
    <View pointerEvents="none" style={s.orbit} />
    <View pointerEvents="none" style={s.innerOrbit} />
    <View style={s.symbol}><Svg width={30} height={30} viewBox="0 0 24 24" fill="none"><Path d="M5 8h14l1 13H4L5 8Zm4 0V6a3 3 0 0 1 6 0v2m-6 6 2 2 4-4" stroke="#E7D5AA" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></Svg></View>
    <Text style={s.kicker}>THE FINAL TOUCH</Text>
    <Text style={s.title}>Yours, in a tap.</Text>
    <Text style={s.copy}>Choose how you'd like to pay.</Text>
    <Svg style={s.wave} width="100%" height={26} viewBox="0 0 360 26" preserveAspectRatio="none"><Path d="M0 16Q90 -10 180 14T360 10V26H0Z" fill="#F7F5F0" /></Svg>
  </View>;
}
const s = StyleSheet.create({
  hero: { backgroundColor: '#202D40', borderRadius: 26, padding: 24, paddingBottom: 44, overflow: 'hidden' },
  orbit: { position: 'absolute', right: -55, top: -60, width: 220, height: 220, borderRadius: 110, borderColor: '#405060', borderWidth: 1 },
  innerOrbit: { position: 'absolute', right: -20, top: -25, width: 150, height: 150, borderRadius: 75, backgroundColor: '#2B3C4C' },
  symbol: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#3B4652', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  kicker: { fontSize: 9, letterSpacing: 2, color: '#D2BE92', fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 31, fontWeight: '800', letterSpacing: -1, marginTop: 8 },
  copy: { color: '#AAB7C3', fontSize: 12, marginTop: 9 },
  wave: { position: 'absolute', bottom: -1, left: 0, right: 0 },
});
