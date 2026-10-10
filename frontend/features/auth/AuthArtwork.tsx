import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useAuthLayout } from './AuthFrame';

type IconName = 'fast' | 'local' | 'trusted';
function BenefitIcon({ name }: { name: IconName }) {
  return <Svg width={28} height={28} viewBox="0 0 28 28" fill="none" accessible={false}>
    {name === 'fast' ? <Path d="m16 1-12 15h9l-2 11L24 11h-9l1-10Z" fill="#148A35" /> : name === 'local' ? <>
      <Path d="M14 27S4 17 4 11a10 10 0 0 1 20 0c0 6-10 16-10 16Z" fill="#148A35" /><Circle cx={14} cy={10} r={4} fill="white" />
    </> : <><Path d="m14 1 11 4v9c0 6-6 11-11 13C9 25 3 20 3 14V5l11-4Z" fill="#269B48" /><Path d="m8 14 4 4 8-9" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></>}
  </Svg>;
}

export function LoginBenefits() {
  const { showDecorations } = useAuthLayout();
  const items: { icon: IconName; title: string; copy: string }[] = [
    { icon: 'fast', title: 'Fast', copy: 'Quick Shopping' },
    { icon: 'local', title: 'Local', copy: 'Support Local' },
    { icon: 'trusted', title: 'Trusted', copy: 'Safe & Secure' },
  ];
  if (!showDecorations) return null;
  return <View style={s.benefits}>{items.map(item => <View key={item.icon} style={s.benefit}>
    <View style={s.circle}><BenefitIcon name={item.icon} /></View>
    <Text style={s.title}>{item.title}</Text><Text style={s.copy}>{item.copy}</Text>
  </View>)}</View>;
}

export function TrustFooter() {
  const { compact } = useAuthLayout();
  if (compact) return null;
  return <View style={s.privacy}><BenefitIcon name="trusted" />
    <Text style={s.privacyText}>{'Your information is safe with us\nWe value your privacy'}</Text>
  </View>;
}

export function LoginArtwork() {
  const { showDecorations } = useAuthLayout();
  if (!showDecorations) return null;
  return <LinearGradient colors={['#F4FAEE', '#EAF8F1', '#F6FBF7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.promo}>
    <Svg width={126} height={115} viewBox="0 0 140 125" accessible={false}>
      <Path d="m17 26 53-7 9 91-54 3Z" fill="#8ECD43" /><Path d="m17 26 9 87-14-12-3-69Z" fill="#3E9F36" />
      <Path d="M28 34c-7-35 29-35 25-5" fill="none" stroke="#458C2A" strokeWidth={3} />
      <Path d="M27 19C12 15 16 3 14 0c16 5 23 11 13 19Z" fill="#5CA82B" />
      <Rect x={47} y={48} width={62} height={69} rx={5} fill="#20A43D" />
      <Path d="M61 55V35c0-23 28-23 28 0v20" fill="none" stroke="#13832D" strokeWidth={4} />
      <Path d="M64 97c-8-24 10-35 33-34-3 20-9 34-33 34Z" fill="#F7FFF0" />
      <Path d="m64 99 26-28" stroke="#71B944" strokeWidth={2} />
      <Circle cx={13} cy={100} r={13} fill="#EE6447" /><Path d="m11 88 2-8 4 10" fill="#348C39" />
      <Path d="m118 67 12 3-3 10 5 8-10 31-19-6 10-31 6-4Z" fill="#ADE3BA" /><Path d="m118 65 14 4-2 7-14-4Z" fill="#25854B" />
    </Svg>
    <View style={s.promoCopy}><Text style={s.promoTitle}>{'Quality products\nfrom your local stores'}</Text><Text style={s.promoCaption}>Fresh · Reliable · Near You</Text></View>
  </LinearGradient>;
}

const s = StyleSheet.create({
  benefits: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, marginBottom: 26, gap: 8 },
  benefit: { flex: 1, alignItems: 'center' },
  circle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EDF8ED', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  title: { color: '#092725', fontSize: 14, fontWeight: '600' },
  copy: { color: '#45535B', fontSize: 11, marginTop: 4, textAlign: 'center' },
  promo: { minHeight: 124, borderRadius: 28, flexDirection: 'row', alignItems: 'center', padding: 8 },
  promoCopy: { flex: 1, paddingLeft: 6 },
  promoTitle: { color: '#102E2A', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  promoCaption: { color: '#15853D', fontSize: 10, marginTop: 8 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 32, marginBottom: 8 },
  privacyText: { flexShrink: 1, color: '#4D5B62', fontSize: 12, lineHeight: 19 },
});
