import { ShopStackParamList } from '../navigation/user/shop-routes';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { useNotifications } from '../features/notifications/NotificationProvider';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api/auth-api';

export function usePushNotifications(userId: string | undefined, navigation: NativeStackNavigationProp<ShopStackParamList>) {
  const { target, consume } = useNotifications();
  const { user, setUser } = useAuth();
  useEffect(() => {
    if (!userId || !target) return;
    if (target.type === 'order-operations') {
      consume();
      if (user?.roles?.includes('seller') && !user.roles.includes('admin') && user.isActive && user.storeStatus === 'approved') {
        setUser({ ...user, mode: 'seller' });
        void authApi.switchMode('seller').catch(() => {});
      }
      return;
    }
    navigation.navigate('OrderDetails', { orderId: target.orderId });
    consume();
  }, [userId, target, navigation, consume, user, setUser]);
}
