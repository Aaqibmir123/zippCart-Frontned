import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { startLogoutRecovery } from '../services/auth/logout-recovery';

export function PendingLogoutRecovery() {
  const { user, isRestoringSession } = useAuth();
  useEffect(() => {
    if (user || isRestoringSession) return;
    return startLogoutRecovery({
      isForeground: () => !AppState.currentState || AppState.currentState === 'active',
      subscribe: (listener) => {
        const subscription = AppState.addEventListener('change', listener);
        return () => subscription.remove();
      },
    });
  }, [user, isRestoringSession]);
  return null;
}
