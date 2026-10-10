import { AppLoader } from '../../components/AppLoader';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { StoreEarning } from './earnings-api';
import { EarningsCards, PeriodSummary } from './EarningsCards';
import { StoreBalances } from './StoreBalances';
import { OrderEarnings, PayoutHistory } from './StatementRows';
import { StatementPeriod } from './StatementPeriod';
import { StatementTab, usePayoutStatement } from './usePayoutStatement';
import { ps as s } from './payout.styles';
import { HoldBreakdown, SettlementFilters } from './SettlementFilters';

export function EarningsScreen({ admin = false, seller = false, onPay, onCollect }: {
  admin?: boolean; seller?: boolean; onPay?: (store: StoreEarning) => void; onCollect?: (orderId: string) => void;
}) {
  const state = usePayoutStatement(admin);
  const { query, period, storeId, page, tab } = state;
  const data = query.data;
  const count = tab === 'Orders' ? data?.orderCount ?? 0 : data?.payoutCount ?? 0;
  const styles = seller ? { page: s.sellerPage, content: s.sellerContent, title: s.sellerTitle,
    tabs: s.sellerTabs, tab: s.sellerTab, active: s.sellerActiveTab, link: s.sellerLink,
    card: s.sellerCard, muted: s.sellerMuted } : { page: s.page, content: s.content, title: s.title,
    tabs: s.tabs, tab: s.tab, active: s.active, link: s.link, card: s.card, muted: s.muted };
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}>
    <Text style={styles.title}>{admin ? 'Seller payouts' : 'My earnings'}</Text>
    {!!storeId && <Pressable style={s.touch} onPress={() => state.selectStore('')}><Text style={styles.link}>← All sellers</Text></Pressable>}
    {query.isError && <Pressable style={styles.card} onPress={() => void query.refetch()}>
      <Text accessibilityRole="alert" style={s.error}>{data ? 'Refresh failed. Showing last loaded amounts. Tap to retry.' : 'Could not load payouts. Tap to retry.'}</Text>
    </Pressable>}
    {query.isPending ? <AppLoader accessibilityLabel="Loading payouts" /> : data && <>
      {tab === 'Balances' && <><EarningsCards data={data} admin={admin} seller={seller} /><HoldBreakdown groups={data.holds} admin={admin} seller={seller} /></>}
    </>}
    <View style={styles.tabs}>{(['Balances', 'Orders', 'History'] as StatementTab[]).map((value) => <Pressable key={value}
      accessibilityRole="tab" accessibilityState={{ selected: value === tab }} onPress={() => state.selectTab(value)}
      style={[styles.tab, value === tab && styles.active]}><Text style={styles.link}>{value === 'Orders' ? 'Earnings' : value}</Text></Pressable>)}</View>
    {tab !== 'Balances' && <StatementPeriod period={period} data={data} onPeriod={state.selectPeriod}
      onShift={state.shift} onToday={state.resetDate} seller={seller} />}
    {data && <>
      {tab === 'Balances' ? <StoreBalances stores={data.stores} admin={admin} seller={seller} selected={storeId}
        onSelect={state.selectStore} onPay={query.isError ? undefined : onPay} />
        : tab === 'Orders' ? <><PeriodSummary data={data} admin={admin} seller={seller} />
          <SettlementFilters groups={data.periodStates} selected={state.filter} onSelect={state.selectFilter} seller={seller} />
          <OrderEarnings data={data} admin={admin} seller={seller} onCollect={query.isError ? undefined : onCollect} /></>
        : <PayoutHistory data={data} admin={admin} seller={seller} />}
      {tab !== 'Balances' && count > 30 && <View style={s.row}>
        <Pressable style={s.touch} disabled={page === 1} onPress={() => state.setPage(page - 1)}><Text style={[s.link, page === 1 && { opacity: 0.35 }]}>Previous</Text></Pressable>
        <Text style={s.muted}>{page} / {Math.ceil(count / 30)}</Text>
        <Pressable style={s.touch} disabled={page * 30 >= count} onPress={() => state.setPage(page + 1)}><Text style={[s.link, page * 30 >= count && { opacity: 0.35 }]}>Next</Text></Pressable>
      </View>}
    </>}
  </ScrollView>;
}
