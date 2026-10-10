import { isShipping } from '../../../features/orders/fulfillment';
import { Image, Pressable, Text, View } from 'react-native';
import { Order } from '../../../services/api/order-api';
import { money } from '../../../utils/money';
import { orderDate, orderStatus } from '../../../features/orders/order-presentation';
import { s } from '../../../features/orders/orders.styles';
import { useAppTheme } from '../../../theme/ThemeProvider';

export function OrderHistoryCard({ order, onOpen, onReorder }: {
  order: Order; onOpen: () => void; onReorder: () => void;
}) {
  const theme = useAppTheme();
  const status = orderStatus(order);
  const first = order.items[0];
  const shipping = isShipping(order);
  return <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    <View style={s.top}>
      <View style={s.orderHeading}><Text style={[s.orderId, { color: theme.colors.text }]}>Order #{order.id.slice(-8).toUpperCase()}</Text>
        <Text style={[s.date, { color: theme.colors.muted }]}>{orderDate(order.createdAt)}</Text></View>
      <View style={[s.pill, status.green && s.green]}><Text style={[s.pillText, status.green && s.greenText]}>{status.label}</Text></View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`View order ${order.id.slice(-8)}`} onPress={onOpen}
      style={({ pressed }) => [s.product, pressed && s.pressed]}>
      <View style={[s.photo, { backgroundColor: theme.colors.raised }]}>{first?.coverImage ? <Image source={{ uri: first.coverImage }} style={s.image} /> : <Text style={[s.options, { color: theme.colors.muted }]}>No image</Text>}</View>
      <View style={s.productCopy}>
        <Text numberOfLines={2} style={[s.name, { color: theme.colors.text }]}>{first?.name ?? 'Order items'}</Text>
        <Text numberOfLines={1} style={[s.options, { color: theme.colors.muted }]}>{[first?.color, first?.size, first && `Qty: ${first.quantity}`].filter(Boolean).join(' | ')}</Text>
        {order.items.length > 1 && <Text style={[s.options, { color: theme.colors.muted }]}>+{order.items.length - 1} more items</Text>}
        <Text style={[s.price, { color: theme.colors.text }]}>{money(order.total)}</Text>
      </View><Text style={s.chevron}>{'›'}</Text>
    </Pressable>
    <View style={[s.actions, { borderTopColor: theme.colors.border }]}>
      {!shipping && <Pressable accessibilityRole="button" accessibilityLabel="Buy this order again" onPress={onReorder}
        style={({ pressed }) => [s.button, theme.isDark && { backgroundColor: theme.colors.raised, borderColor: theme.colors.border }, pressed && s.pressed]}>
        <Text style={[s.buttonText, { color: theme.colors.primary }]}>Buy again</Text>
      </Pressable>}
      <Pressable accessibilityRole="button" onPress={onOpen}
        style={({ pressed }) => [s.button, s.primary, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, pressed && s.pressed]}>
        <Text style={[s.buttonText, s.white]}>View order</Text>
      </Pressable>
    </View>
  </View>;
}
