import type { NotificationResponse } from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function isExpoGo(): boolean {
  const runtime = (Constants as unknown as { executionEnvironment?: string }).executionEnvironment;
  return Constants.appOwnership === 'expo' || runtime === 'storeClient';
}

function warn(message: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`[ZippCart notifications] ${message}`);
}

function configureNotificationHandler(Notifications: typeof import('expo-notifications'), canShow: (recipientId: unknown) => boolean): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const show = canShow(notification.request.content.data?.recipientId);
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    },
  });
}

export async function registerForPushNotificationsAsync(canShow: (recipientId: unknown) => boolean = () => false): Promise<string | null> {
  try {
    if (isExpoGo()) {
      warn('Expo Go detected; push registration is skipped. Use an EAS development or preview build for push testing.');
      return null;
    }
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
    // Do not evaluate notification native modules until after the Expo Go guard.
    const Device = await import('expo-device');
    if (!Device.isDevice) return null;
    const Notifications = await import('expo-notifications');
    configureNotificationHandler(Notifications, canShow);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order updates', importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250], lightColor: '#7139F5', sound: 'default',
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const permissions = current.status === 'undetermined' && current.canAskAgain
      ? await Notifications.requestPermissionsAsync() : current;
    if (permissions.status !== 'granted') return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) throw new Error('Missing notification project configuration.');
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return result.data;
  } catch {
    throw new Error('Could not enable notifications. Please try again.');
  }
}

export function getOrderIdFromNotification(response: NotificationResponse | null): string | null {
  const data = response?.notification.request.content.data;
  if (!data || typeof data !== 'object') return null;
  const payload = data as { type?: unknown; orderId?: unknown };
  return payload.type === 'order-status' && typeof payload.orderId === 'string' && /^[a-f\d]{24}$/i.test(payload.orderId) ? payload.orderId : null;
}
