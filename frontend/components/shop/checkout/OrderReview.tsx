import { Image, Pressable, Text, View } from 'react-native';
import { CheckoutQuote } from '../../../services/api/order-api';
import { money } from '../../../utils/money';
import { checkoutStyles as s } from '../../../screens/user/checkout/checkout.styles';

export function OrderReview({ quote, onChange, disabled }: {
  quote: CheckoutQuote; onChange: () => void; disabled: boolean;
}) {
  const address = quote.shippingAddress;
  return <>
    <View style={s.card}>
      <View style={s.row}><Text style={s.heading}>Delivery Address</Text>
        <Pressable accessibilityRole="button" disabled={disabled} onPress={onChange} style={s.change}><Text style={s.link}>Change</Text></Pressable></View>
      <Text style={s.name}>{address.name}</Text><Text style={s.muted}>+91 {address.phone}</Text>
      <Text style={s.muted}>{[address.line1, address.locality, address.landmark, address.district, address.city, address.state, address.pincode].filter(Boolean).join(', ')}</Text>
    </View>
    <View style={s.card}>
      <Text style={s.heading}>Order Items ({quote.items.reduce((sum, item) => sum + item.quantity, 0)})</Text>
      {quote.items.map((item, index) => <View key={`${item.productId}-${item.color}-${item.size}-${index}`} style={s.item}>
        <View style={s.photo}>{item.coverImage ? <Image source={{ uri: item.coverImage }} style={s.image} /> : <Text style={s.muted}>Item</Text>}</View>
        <View style={s.itemCopy}><Text style={s.name} numberOfLines={2}>{item.name}</Text>
          <Text style={s.muted}>{[item.color, item.size].filter(Boolean).join(' | ')}</Text><Text style={s.muted}>Qty: {item.quantity}</Text></View>
        <Text style={s.value}>{money(item.price * item.quantity)}</Text>
      </View>)}
    </View>
  </>;
}
