import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';

export function QueryLifecycle() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    focusManager.setFocused(AppState.currentState === 'active');
    const listener = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => listener.remove();
  }, []);
  return null;
}
