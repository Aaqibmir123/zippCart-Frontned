import { AppLoader } from '../../../components/AppLoader';
import { useState } from 'react';
import { EarningsShortcut } from '../../earnings/EarningsCards';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { AdminTab } from '../stores/AdminDrawer';
import { OrderQueue, useAdminAnalytics } from './dashboard-api';
import { OrderQueueTiles } from './OrderQueueTiles';
import { BusinessAnalytics } from './BusinessAnalytics';
import { ds as s } from './dashboard.styles';
import { dashboardError } from './dashboard-error';
export function AdminDashboard({ onNavigate, onQueue }: { onNavigate: (tab: AdminTab) => void; onQueue: (queue: OrderQueue) => void }) {
  const [days, setDays] = useState(7);
  const query = useAdminAnalytics(days);
  const data = query.data;
  return <ScrollView style={{ backgroundColor: '#F6F2FB' }} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}>
    <View style={s.between}><Text style={s.title}>Overview</Text><Text style={s.muted}>{data ? `Updated ${new Date(data.updatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'Loading'}</Text></View>
    <EarningsShortcut admin onPress={() => onNavigate('Earnings')} />
    <View style={s.periods}>{[1, 7, 30].map((value) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: days === value }} onPress={() => setDays(value)} style={[s.period, days === value && s.active]}><Text style={days === value ? s.link : s.text}>{value === 1 ? 'Today' : `${value} days`}</Text></Pressable>)}</View>
    {query.isError && <Pressable accessibilityRole="button" style={s.card} onPress={() => void query.refetch()}>
      <Text style={s.error}>{dashboardError(query.error)}</Text>
      {data && <Text style={s.muted}>Showing last loaded data.</Text>}
      <Text style={s.link}>Tap to retry</Text>
    </Pressable>}
    {query.isPending ? <AppLoader color="#7139F5" /> : data && <>
      <View style={s.between}><Text style={s.heading}>Order queues</Text><Pressable onPress={() => onQueue('all')}><Text style={s.link}>All {data.queues.all} →</Text></Pressable></View>
      <Text style={s.muted}>Current totals · In progress = seller viewed · Return queues can overlap</Text>
      <OrderQueueTiles counts={data.queues} onSelect={onQueue} />
      <View style={s.grid}>
        <Pressable style={[s.tile, { backgroundColor: '#EAF0FF' }]} onPress={() => onNavigate('Requests')}><Text style={s.number}>{data.stores.pending}</Text><Text style={s.text}>Store requests</Text></Pressable>
        <Pressable style={[s.tile, { backgroundColor: '#E3F6ED' }]} onPress={() => onNavigate('Stores')}><Text style={s.number}>{data.stores.open}</Text><Text style={s.text}>Open stores · {data.stores.approved} approved</Text></Pressable>
      </View>
      <BusinessAnalytics data={data} />
    </>}
  </ScrollView>;
}
