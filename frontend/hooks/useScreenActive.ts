import { useCallback, useContext, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { NavigationContext } from '@react-navigation/native';

const appListeners = new Set<() => void>();
let appSubscription: ReturnType<typeof AppState.addEventListener> | undefined;
const appActive = () => AppState.currentState === 'active';
function subscribeApp(listener: () => void) {
  appListeners.add(listener);
  if (!appSubscription) appSubscription = AppState.addEventListener('change', () => {
    appListeners.forEach((notify) => notify());
  });
  return () => {
    appListeners.delete(listener);
    if (!appListeners.size) { appSubscription?.remove(); appSubscription = undefined; }
  };
}

// Seller/admin workspaces and startup loaders also render outside a stack screen.
// An explicit flag handles embedded tabs that navigation cannot observe.
export function useScreenActive(enabled = true) {
  const navigation = useContext(NavigationContext);
  const subscribeFocus = useCallback((listener: () => void) => {
    if (!navigation) return () => {};
    const focus = navigation.addListener('focus', listener);
    const blur = navigation.addListener('blur', listener);
    return () => { focus(); blur(); };
  }, [navigation]);
  const getFocus = useCallback(() => navigation?.isFocused() ?? true, [navigation]);
  const focused = useSyncExternalStore(subscribeFocus, getFocus, getFocus);
  const active = useSyncExternalStore(subscribeApp, appActive, appActive);
  return enabled && focused && active;
}
