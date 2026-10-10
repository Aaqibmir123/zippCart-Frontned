import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ShopStackParamList } from '../../navigation/user/shop-routes';
import { categories } from '../../data/products';
import { useAppTheme } from '../../theme/ThemeProvider';

export function CategoriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  const theme = useAppTheme();
  return <View style={[s.page, { backgroundColor: theme.colors.background }]}>
    <Text style={[s.title, { color: theme.colors.text }]}>Shop by category</Text>
    <Text style={[s.subtitle, { color: theme.colors.muted }]}>Find your next favourite, your way.</Text>
    <View style={s.grid}>{categories.map(({ label: category }) => <Pressable key={category} style={[s.card, { backgroundColor: theme.colors.raised, borderColor: theme.colors.border }]} onPress={() => navigation.navigate('ProductListing', { title: category, category })}>
      <Text style={[s.cardText, { color: theme.colors.text }]}>{category}</Text>
    </Pressable>)}</View>
  </View>;
}

const s = StyleSheet.create({
  page: { backgroundColor: '#FFF9FB', flex: 1, padding: 20 },
  title: { color: '#101D46', fontSize: 28, fontWeight: '900', marginTop: 28 },
  subtitle: { color: '#697AA5', fontSize: 13, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 },
  card: { alignItems: 'center', backgroundColor: '#FFF0F5', borderColor: '#F5DCE8', borderRadius: 16, borderWidth: 1, justifyContent: 'center', minHeight: 92, padding: 14, width: '47%' },
  cardText: { color: '#101D46', fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
