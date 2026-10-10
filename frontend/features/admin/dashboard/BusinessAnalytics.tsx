import { Text, View } from 'react-native';
import { AdminAnalytics } from './dashboard-api';
import { ds as s } from './dashboard.styles';
import { money } from '../../../utils/money';
export function BusinessAnalytics({ data }: { data: AdminAnalytics }) {
  const max = Math.max(1, ...data.daily.map((day) => day.value));
  return <>
    <View style={s.hero}><Text style={s.heroLabel}>ORDER VALUE</Text><Text style={s.heroValue}>{money(data.totals.orderValue)}</Text>
      <Text style={s.heroText}>{data.totals.orders} orders · {data.totals.deliveredOrders} delivered</Text></View>
    <View style={s.grid}>
      <View style={[s.tile, { backgroundColor: '#E3F6ED' }]}><Text style={s.muted}>Recorded payments</Text><Text style={s.heading}>{money(data.totals.paidValue)}</Text></View>
      <View style={[s.tile, { backgroundColor: '#FCE8F2' }]}><Text style={s.muted}>Recorded refunds</Text><Text style={s.heading}>{money(data.refunds.amount)}</Text><Text style={s.muted}>{data.refunds.count} completed refunds</Text>{data.refunds.legacyCount > 0 && <Text style={s.muted}>+ {data.refunds.legacyCount} older refunds without recorded amounts</Text>}</View>
    </View>
    <View style={s.card}><Text style={s.heading}>Order value trend</Text><View style={s.between}><Text style={s.muted}>Daily peak {money(max === 1 && !data.totals.orders ? 0 : max)}</Text><Text style={s.muted}>IST</Text></View>
      <View style={s.bars}>{data.daily.map((day) => <View key={day.date} accessibilityLabel={`${day.date}: ${day.orders} orders, ${money(day.value)}`}
        style={[s.bar, { height: day.value ? Math.max(3, day.value / max * 100) : 1, opacity: day.value ? 1 : 0.15 }]} />)}</View>
      <View style={s.between}><Text style={s.muted}>{data.daily[0]?.date}</Text><Text style={s.muted}>{data.daily.at(-1)?.date}</Text></View>
    </View>
    <View style={s.card}><Text style={s.heading}>Top stores</Text><Text style={s.muted}>Ranked by ordered item value in this period</Text>
      {!data.topStores.length && <Text style={s.text}>No store orders in this period.</Text>}
      {data.topStores.map((store, index) => <View key={store.id} style={[s.row, index > 0 && s.separator]}>
        <Text style={s.rank}>{index + 1}</Text><View style={{ flex: 1, gap: 5 }}><Text style={s.heading}>{store.name}</Text>
          <Text style={s.muted}>{store.orders} orders · {store.deliveredOrders} delivered · {store.units} units</Text>
          <Text style={[s.pill, { alignSelf: 'flex-start', backgroundColor: store.isActive && store.isOpen ? '#E3F6ED' : '#F0EBF5', color: store.isActive && store.isOpen ? '#187A53' : '#85758E' }]}>{!store.isActive ? 'Inactive' : store.isOpen ? 'Open' : 'Closed'}</Text>
        </View><Text style={s.link}>{money(store.value)}</Text>
      </View>)}
    </View>
    <View style={s.card}><Text style={s.heading}>Most ordered products</Text><Text style={s.muted}>Demand by units ordered · cancelled orders excluded</Text>
      {!data.topProducts.length && <Text style={s.text}>No product orders in this period.</Text>}
      {data.topProducts.map((product, index) => <View key={product.id ?? index} style={[s.row, index > 0 && s.separator]}><Text style={s.rank}>{index + 1}</Text>
        <View style={{ flex: 1 }}><Text style={s.text}>{product.name}</Text><Text style={s.muted}>{product.units} units ordered</Text></View><Text style={s.link}>{money(product.value)}</Text></View>)}
    </View>
  </>;
}
