import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificationResponse } from 'expo-notifications';
import { useAuth } from '../../context/AuthContext';
import { isExpoGo, registerForPushNotificationsAsync } from '../../services/notifications/push-notifications';
import { notificationApi } from '../../services/notifications/notification-api';
import { isApiError } from '../../services/api/api-error';

type Target = { orderId: string; recipientId: string; type: 'order-status' | 'order-operations' };
type Status = 'unsupported' | 'pending' | 'enabled' | 'denied' | 'error';
type State = { status: Status; target: Target | null; retry: () => void; consume: () => void };
const Context = createContext<State>({ status: 'unsupported', target: null, retry: () => {}, consume: () => {} });
const refreshKeys = ['orders', 'order', 'seller-orders', 'admin-shipping-all', 'admin-shipping-detail',
  'admin-analytics', 'shipping-operations', 'inventory-alerts', 'notification-inbox'];

export function NotificationProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [status, setStatus] = useState<Status>('pending');
  const [target, setTarget] = useState<Target | null>(null);
  const retryRef = useRef<() => void>(() => {});
  const retry = useCallback(() => retryRef.current(), []);
  const consume = useCallback(() => setTarget(null), []);
  useEffect(() => {
    setTarget(null);
    if (!user || isExpoGo() || !['android', 'ios'].includes(Platform.OS)) {
      setStatus('unsupported'); return;
    }
    let active = true;
    let busy = false;
    let lastAttempt = 0;
    let registeredToken: string | null = null;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const abort = new AbortController();
    const subscriptions: { remove: () => void }[] = [];
    const refresh = () => {
      if (active) refreshKeys.forEach((key) => { void client.invalidateQueries({ queryKey: [key] }).catch(() => {}); });
    };
    async function register(force = false) {
      if (!active || busy || (!force && Date.now() - lastAttempt < 60_000)) return;
      busy = true;
      clearTimeout(retryTimer);
      lastAttempt = Date.now();
      setStatus('pending');
      try {
        const token = await registerForPushNotificationsAsync((recipientId) => active && recipientId === user!.id);
        if (!active) return;
        if (!token) { setStatus('denied'); return; }
        if (token !== registeredToken) {
          await notificationApi.registerDevice({ token, platform: Platform.OS as 'android' | 'ios' }, abort.signal);
          registeredToken = token;
        }
        retryCount = 0;
        if (active) setStatus('enabled');
      } catch (error) {
        if (!active) return;
        setStatus('error');
        const code = isApiError(error) ? error.status : undefined;
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('Notification registration failed.', { status: code ?? 'provider-or-network' });
        }
        // Retry temporary outages without asking permission again or depending
        // on a drawer button. Permanent API failures need a server/session fix.
        const delays = [5000, 15000, 60000];
        if ((!code || code >= 500 || code === 429) && retryCount < delays.length) {
          const retryAfter = isApiError(error) ? (error.retryAfterSeconds ?? 0) * 1000 : 0;
          const delay = Math.max(delays[retryCount++], retryAfter);
          retryTimer = setTimeout(() => { void register(true); }, delay);
        }
      }
      finally { busy = false; }
    }
    retryRef.current = () => { retryCount = 0; void register(true); };
    async function setup() {
      const Notifications = await import('expo-notifications');
      if (!active) return;
      function receive(response: NotificationResponse) {
        const data = response.notification.request.content.data;
        if (!active || !data || data.recipientId !== user!.id || typeof data.orderId !== 'string' ||
          !/^[a-f\d]{24}$/i.test(data.orderId) || !['order-status', 'order-operations'].includes(String(data.type))) return;
        setTarget({ orderId: data.orderId, recipientId: user!.id, type: data.type as Target['type'] });
        refresh();
        void Notifications.clearLastNotificationResponseAsync().catch(() => {});
      }
      subscriptions.push(Notifications.addNotificationResponseReceivedListener(receive));
      subscriptions.push(Notifications.addNotificationReceivedListener((notification) => {
        if (notification.request.content.data?.recipientId === user!.id) refresh();
      }));
      subscriptions.push(Notifications.addPushTokenListener(() => {
        registeredToken = null; void register(true);
      }));
      await register(true);
      const last = await Notifications.getLastNotificationResponseAsync().catch(() => null);
      if (last) receive(last);
    }
    void setup().catch(() => { if (active) setStatus('error'); });
    subscriptions.push(AppState.addEventListener('change', (state) => {
      if (state === 'active') { retryCount = 0; void register(); }
    }));
    return () => {
      active = false; abort.abort(); retryRef.current = () => {};
      clearTimeout(retryTimer);
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [user?.id, client]);
  return <Context.Provider value={{ status, target: target?.recipientId === user?.id ? target : null, retry, consume }}>{children}</Context.Provider>;
}

export const useNotifications = () => useContext(Context);
