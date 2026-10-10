import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ShopProductDetail } from '../../../services/api/product-api';
import { useAppTheme } from '../../../theme/ThemeProvider';

const paths = {
  card: 'M3 5h18v14H3V5ZM3 9h18M7 14h4',
  returns: 'M5 8h10a6 6 0 1 1-5 10M5 8l4-4M5 8l4 4',
  box: 'm3 7 9-4 9 4v11l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v11',
  tag: 'M3 12 12 3h8v8l-9 10-8-9ZM16 7h.01',
};
function Icon({ name }: { name: keyof typeof paths }) {
  return <Svg width={23} height={23} viewBox="0 0 24 24" fill="none"><Path d={paths[name]} stroke="#8B2CFF" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function ProductInformation({ product }: { product: ShopProductDetail }) {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [policy, setPolicy] = useState<string | null>(null);
  const services = [
    { icon: 'card' as const, title: 'Cash on Delivery', subtitle: 'Pay when your order arrives', detail: 'Cash on delivery is available at checkout. Your final total includes the delivery charge shown before placing your order.' },
    { icon: 'returns' as const, title: 'Returns & exchanges', subtitle: 'Request within 24 hours of receipt', detail: 'Confirm receipt in your orders, then request a return within 24 hours. Requests are subject to review; keep your product and packaging ready.' },
    { icon: 'box' as const, title: 'Seller information', subtitle: product.storeName || 'View product seller', detail: `Sold by ${product.storeName || 'this store'}. You can track this purchase from your orders after checkout.` },
  ];
  const highlights = [
    { icon: 'tag' as const, label: 'Category', value: product.category },
    { icon: 'box' as const, label: 'Brand', value: product.brand || product.storeName || 'Independent seller' },
    { icon: 'card' as const, label: 'Payment', value: 'Pay on delivery' },
    { icon: 'returns' as const, label: 'Returns', value: '24-hour window' },
  ];
  return <View style={s.section}>
    <View style={[s.serviceList, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>{services.map((item, index) => <View key={item.title}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: policy === item.title }} onPress={() => setPolicy(policy === item.title ? null : item.title)} style={[s.serviceRow, index < 2 && s.divider, index < 2 && { borderColor: theme.colors.border }]}>
        <View style={[s.icon, { backgroundColor: theme.colors.raised }]}><Icon name={item.icon} /></View><View style={s.copy}><Text style={[s.serviceTitle, { color: theme.colors.text }]}>{item.title}</Text><Text style={[s.subtitle, { color: theme.colors.muted }]}>{item.subtitle}</Text></View><Text style={[s.chevron, { color: theme.colors.muted }]}>{policy === item.title ? '-' : '�'}</Text>
      </Pressable>
      {policy === item.title && <Text style={[s.policy, { color: theme.colors.muted }]}>{item.detail}</Text>}
    </View>)}</View>
    <View style={[s.block, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text accessibilityRole="header" style={[s.title, { color: theme.colors.text }]}>Product Highlights</Text>
      <View style={s.highlights}>{highlights.map((item) => <View key={item.label} style={[s.highlight, { backgroundColor: theme.colors.raised }]}><Icon name={item.icon} /><Text style={[s.highlightValue, { color: theme.colors.text }]} numberOfLines={2}>{item.value}</Text><Text style={[s.highlightLabel, { color: theme.colors.muted }]}>{item.label}</Text></View>)}</View>
    </View>
    <View style={[s.block, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text accessibilityRole="header" style={[s.title, { color: theme.colors.text }]}>Product Description</Text>
      <Text numberOfLines={expanded ? undefined : 4} style={[s.description, { color: theme.colors.muted }]}>{product.description.trim() || 'No description has been provided for this product.'}</Text>
      {expanded && <View style={s.details}><Text style={[s.detail, { color: theme.colors.muted }]}>Category: {product.category}</Text>{!!product.brand && <Text style={[s.detail, { color: theme.colors.muted }]}>Brand: {product.brand}</Text>}<Text style={[s.detail, { color: theme.colors.muted }]}>Sold by: {product.storeName || 'Independent seller'}</Text></View>}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={s.readMore}><Text style={[s.link, { color: theme.colors.primary }]}>{expanded ? 'Read less ^' : 'Read more ?'}</Text></Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  section: { paddingTop: 16 }, serviceList: { borderWidth: 1, borderColor: '#EEEAF4', borderRadius: 16, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 63 }, divider: { borderBottomWidth: 1, borderColor: '#F1EEF5' },
  icon: { width: 36, height: 36, borderRadius: 9, backgroundColor: '#F8F3FF', justifyContent: 'center', alignItems: 'center' },
  copy: { flex: 1 }, serviceTitle: { color: '#23213E', fontSize: 12, fontWeight: '700' }, subtitle: { color: '#858096', fontSize: 11, marginTop: 4 },
  chevron: { color: '#9C91B1', fontSize: 22 }, policy: { fontSize: 12, lineHeight: 19, color: '#716A80', paddingBottom: 14 },
  block: { borderWidth: 1, borderColor: '#E8DEF4', marginTop: 12, padding: 15, borderRadius: 16, backgroundColor: '#FCFAFF' }, title: { color: '#23213E', fontSize: 16, fontWeight: '800', letterSpacing: -0.4 },
  highlights: { flexDirection: 'row', gap: 7, marginTop: 12 }, highlight: { flex: 1, paddingHorizontal: 4, paddingVertical: 13, borderRadius: 9, backgroundColor: '#EDE2FA', alignItems: 'center', gap: 5 },
  highlightValue: { color: '#493A66', fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 14, minHeight: 28 }, highlightLabel: { color: '#9183AA', fontSize: 9 },
  description: { color: '#787086', fontSize: 13, lineHeight: 20, marginTop: 10 }, details: { gap: 5, paddingTop: 12 }, detail: { color: '#787086', fontSize: 12 },
  readMore: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }, link: { color: '#8B2CFF', fontSize: 12, fontWeight: '600' },
});
