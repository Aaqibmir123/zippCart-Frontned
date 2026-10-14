import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useAuth } from '../../context/AuthContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ShopTabBar } from '../../components/shop/ShopTabBar';
import { CartScreen } from '../../screens/user/CartScreen';
import { FavoritesScreen } from '../../screens/user/FavoritesScreen';
import { HomeScreen } from '../../screens/user/HomeScreen';
import { OrdersScreen } from '../../screens/user/OrdersScreen';
import { ProductDetailsScreen } from '../../screens/user/ProductDetailsScreen';
import { OrderDetailsScreen } from '../../screens/user/OrderDetailsScreen';
import { BuyNowScreen } from '../../screens/user/BuyNowScreen';
import { CheckoutScreen } from '../../screens/user/CheckoutScreen';
import { ShopStackParamList, ShopTabParamList } from './shop-routes';
import { AccountScreen } from '../../features/account/AccountScreen';
import { CategoriesScreen } from '../../features/catalog/CategoriesScreen';
import { ProductListingScreen } from '../../features/catalog/ProductListingScreen';
import { NotificationsScreen } from '../../features/notifications/NotificationsScreen';
import { ThemeProvider } from '../../theme/ThemeProvider';

const Tab = createBottomTabNavigator<ShopTabParamList>();
const Stack = createNativeStackNavigator<ShopStackParamList>();

export function ShopNavigator() {
  return (
    <ThemeProvider><Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={ShopTabs} name="ShopTabs" />
      <Stack.Screen component={ProductDetailsScreen} name="ProductDetails" />
      <Stack.Screen component={OrderDetailsScreen} name="OrderDetails" />
      <Stack.Screen component={NotificationsScreen} name="Notifications" />
      <Stack.Screen component={BuyNowScreen} name="BuyNow" />
      <Stack.Screen component={CheckoutScreen} name="Checkout" />
      <Stack.Screen component={CategoriesScreen} name="Categories" />
      <Stack.Screen component={ProductListingScreen} name="ProductListing" />
    </Stack.Navigator></ThemeProvider>
  );
}

function ShopTabs() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ShopStackParamList>>();
  usePushNotifications(user?.id, navigation);
  return (
    <Tab.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }} tabBar={(props) => <ShopTabBar {...props} />}>
      <Tab.Screen component={CartScreen} name="Cart" />
      <Tab.Screen component={HomeScreen} name="Home" />
      <Tab.Screen component={OrdersScreen} name="Orders" />
      <Tab.Screen component={FavoritesScreen} name="Favorites" />
      <Tab.Screen component={AccountScreen} name="Account" />
    </Tab.Navigator>
  );
}
