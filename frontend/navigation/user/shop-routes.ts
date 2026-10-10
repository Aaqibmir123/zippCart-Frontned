import { NavigatorScreenParams } from '@react-navigation/native';
import { BuyNowItem, CheckoutAddress } from '../../services/api/order-api';
import { ProductCategory } from '../../data/products';

export type ShopTabParamList = {
  Cart: undefined;
  Home: { view?: 'home' | 'categories' | 'offers' } | undefined;
  Orders: undefined;
  Favorites: undefined;
  Account: undefined;
};

export type ShopStackParamList = {
  ShopTabs: NavigatorScreenParams<ShopTabParamList> | undefined;
  BuyNow: BuyNowItem;
  Checkout: { address: CheckoutAddress };
  ProductDetails: { productId: string };
  OrderDetails: { orderId: string };
  Notifications: undefined;
  Categories: undefined;
  ProductListing: { title: string; category?: ProductCategory | 'All'; search?: string; deals?: boolean; store?: string };
};
