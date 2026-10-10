import { StyleSheet, Text, View } from 'react-native';
import { AccountPage } from './AccountMenuRow';
import { ProfileForm } from './ProfileForm';
import { SupportPanel } from './SupportPanel';
import { AppInfoPanel } from './AppInfoPanel';

type Props = { page: Exclude<AccountPage, 'Your store' | 'Store requests'>; onSave: () => void };
export function AccountPanel({ page, onSave }: Props) {
  if (page === 'Profile') return <ProfileForm onSaved={onSave} />;
  if (page === 'Support') return <SupportPanel />;
  if (page === 'App info') return <AppInfoPanel />;
  const content = {
    Coupons: { mark: '%', title: 'A little more rewarding.', copy: 'Your offers and saved coupons will appear here.' },
    Referral: { mark: '+', title: 'Good finds are better shared.', copy: 'Invite friends and discover rewards when referrals launch.' },
  }[page];
  return <View style={s.panel}><View style={s.featureMark}><Text style={s.mark}>{content.mark}</Text></View><Text style={s.title}>{content.title}</Text><Text style={s.copy}>{content.copy}</Text><View style={s.soon}><Text style={s.soonText}>Coming soon</Text></View></View>;
}
const s = StyleSheet.create({
  panel: { padding: 22 },
  featureMark: { backgroundColor: '#E7E2F4', width: 76, height: 76, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginVertical: 24 },
  mark: { color: '#77709E', fontSize: 30, fontWeight: '800' },
  title: { color: '#354159', fontSize: 24, fontWeight: '800', lineHeight: 31 },
  copy: { color: '#9290A4', fontSize: 13, lineHeight: 21, marginTop: 12 },
  soon: { alignSelf: 'flex-start', backgroundColor: '#EBE8F3', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, marginTop: 22 },
  soonText: { color: '#827B9D', fontSize: 11, fontWeight: '700' },
});
