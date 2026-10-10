import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileDrawer } from '../../components/ProfileDrawer';
import { ShopStackParamList } from '../../navigation/user/shop-routes';

export function AccountScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  return <ProfileDrawer
    visible
    onClose={() => navigation.navigate('ShopTabs', { screen: 'Home' })}
    onOpenFavorites={() => navigation.navigate('ShopTabs', { screen: 'Favorites' })}
  />;
}