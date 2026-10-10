import { Pressable, Text, View } from 'react-native';
import { Order } from '../../services/api/order-api';
import { ReturnCase, ReturnRequest } from './return-types';
import { Field } from './ReturnControls';
import { money } from '../../utils/money';
import { rs as s } from './return.styles';

export function remainingQuantity(order: Order, cases: ReturnCase[], index: number) {
  return Math.max(0, order.items[index].quantity - cases.filter((record) => record.status !== 'cancelled')
    .flatMap((record) => record.items).filter((item) => item.index === index).reduce((sum, item) => sum + item.quantity, 0));
}
export function initialReturnItems(order: Order, cases: ReturnCase[]): ReturnRequest['items'] {
  return order.items.flatMap((item, index) => {
    const quantity = remainingQuantity(order, cases, index);
    return quantity > 0 ? [{ index, quantity, exchangeColor: item.color, exchangeSize: item.size }] : [];
  });
}
export function ReturnItemPicker({ order, cases, value, onChange, exchange }: {
  order: Order; cases: ReturnCase[]; value: ReturnRequest['items']; onChange: (items: ReturnRequest['items']) => void; exchange: boolean;
}) {
  function quantity(index: number, next: number) {
    const current = value.find((item) => item.index === index);
    const items = value.filter((item) => item.index !== index);
    if (next > 0) items.push({ index, quantity: next, exchangeColor: current?.exchangeColor ?? order.items[index].color,
      exchangeSize: current?.exchangeSize ?? order.items[index].size });
    onChange(items.sort((a, b) => a.index - b.index));
  }
  return <View style={{ gap: 12 }}>{order.items.map((item, index) => {
    const selected = value.find((entry) => entry.index === index);
    const maximum = remainingQuantity(order, cases, index);
    return <View key={index} style={[s.card, !!selected && s.selected]}>
      <Text style={s.heading}>{item.name}</Text>
      <Text style={s.muted}>{[item.color, item.size].filter(Boolean).join(' · ')} · {money(item.price)} each</Text>
      <Text style={s.text}>Ordered quantity: {item.quantity}</Text>
      {maximum > 0 && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!selected }} accessibilityLabel={`Select ${item.name}`}
        onPress={() => quantity(index, selected ? 0 : maximum)} style={s.secondary}><Text style={s.link}>{selected ? '✓ Selected' : 'Select item'}</Text></Pressable>}
      {maximum > 1 && selected ? <View style={s.between}>
        <Text style={s.text}>Return quantity</Text><View style={s.row}>
          <Pressable accessibilityLabel={`Decrease return quantity for ${item.name}`} disabled={selected.quantity <= 1}
            onPress={() => quantity(index, (selected?.quantity ?? 0) - 1)} style={s.secondary}><Text style={s.link}>−</Text></Pressable>
          <Text style={s.text}>{selected?.quantity ?? 0}</Text>
          <Pressable accessibilityLabel={`Increase return quantity for ${item.name}`} disabled={(selected?.quantity ?? 0) >= maximum}
            onPress={() => quantity(index, (selected?.quantity ?? 0) + 1)} style={s.secondary}><Text style={s.link}>+</Text></Pressable>
        </View>
      </View> : maximum === 0 ? <Text style={s.muted}>Already covered by a return request.</Text>
        : selected ? <Text style={s.muted}>1 item selected</Text> : null}
      {exchange && selected && <>
        <Field label="Requested replacement color" value={selected.exchangeColor} maxLength={40}
          onChange={(exchangeColor) => onChange(value.map((entry) => entry.index === index ? { ...entry, exchangeColor } : entry))} />
        <Field label="Requested replacement size" value={selected.exchangeSize} maxLength={30}
          onChange={(exchangeSize) => onChange(value.map((entry) => entry.index === index ? { ...entry, exchangeSize } : entry))} />
        <Text style={s.muted}>Leave blank for products without size/color options. Availability is checked before approval.</Text>
      </>}
    </View>;
  })}</View>;
}
