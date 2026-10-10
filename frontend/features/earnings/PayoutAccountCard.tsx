import { AppLoader } from '../../components/AppLoader';
import { Pressable, Text, View } from 'react-native';
import { PayoutAccount, usePayoutAccount } from './earnings-api';
import { ps as s } from './payout.styles';

export function AccountDetails({ account, seller = false }: { account: PayoutAccount; seller?: boolean }) {
  return <View style={seller ? s.sellerCard : s.card}>
    <Text style={s.heading}>Payout account</Text>
    {account.method === 'bank' ? <>
      <Detail label="Account holder" value={account.accountHolder} seller={seller} />
      <Detail label="Account number" value={account.accountNumber} seller={seller} />
      <Detail label="IFSC" value={account.ifsc} seller={seller} />
    </> : <Detail label="UPI ID" value={account.upiId} seller={seller} />}
  </View>;
}
function Detail({ label, value, seller = false }: { label: string; value: string; seller?: boolean }) {
  return <View><Text style={seller ? s.sellerMuted : s.muted}>{label}</Text><Text selectable style={s.text}>{value}</Text></View>;
}
export function PayoutAccountCard({ admin, storeId, seller = false }: { admin: boolean; storeId: string; seller?: boolean }) {
  const query = usePayoutAccount(admin, storeId);
  if (query.isPending) return <AppLoader accessibilityLabel="Loading payout account" />;
  if (query.isError) return <Pressable style={seller ? s.sellerCard : s.card} onPress={() => void query.refetch()}>
    <Text style={s.error}>Could not load payout account. Tap to retry.</Text>
  </Pressable>;
  return query.data.account ? <AccountDetails account={query.data.account} seller={seller} />
    : <View style={seller ? s.sellerCard : s.card}><Text style={seller ? s.sellerMuted : s.muted}>No payout account saved.</Text></View>;
}
