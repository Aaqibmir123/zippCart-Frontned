import { AppLoader } from '../../../components/AppLoader';
import { Pressable, Text, View } from 'react-native';
import { EarningsCards, Line } from '../../earnings/EarningsCards';
import { useEarnings } from '../../earnings/earnings-api';
import { settlementOptions } from '../../earnings/settlement-model';
import { ps as s } from '../../earnings/payout.styles';

export function SellerPayoutOverview({ onDetails }: { onDetails: () => void }) {
  const query = useEarnings(false);
  const data = query.data;
  return <View style={{ gap: 12 }}>
    <View style={s.row}><Text style={s.heading}>Your payout</Text>
      <Pressable accessibilityRole="button" onPress={onDetails} style={s.touch}><Text style={s.link}>View details →</Text></Pressable></View>
    {query.isPending && <AppLoader accessibilityLabel="Loading payout" color="#6838F5" />}
    {query.isError && <View style={s.sellerCard}>
      <Text accessibilityRole="alert" style={s.error}>{data ? 'Could not refresh payout. Showing last saved amounts.' : 'Could not load payout.'}</Text>
      <Pressable accessibilityRole="button" disabled={query.isFetching} onPress={() => void query.refetch()} style={s.touch}>
        <Text style={s.link}>{query.isFetching ? 'Retrying…' : 'Retry'}</Text></Pressable>
    </View>}
    {data && <>
      <EarningsCards data={data} admin={false} seller />
      <View style={s.sellerCard}>
        {settlementOptions.filter((option) => !['cleared', 'refunded'].includes(option.key) && data.holds[option.key].sellerPaise > 0)
          .map((option) => <Line key={option.key} label={option.label} value={data.holds[option.key].sellerPaise} />)}
        <Text style={s.muted}>Commission is already deducted. Received payouts are excluded from the ready balance.</Text>
      </View>
    </>}
  </View>;
}
