import { useMutation } from '@tanstack/react-query';

import { authApi } from '../api/auth-api';
import { useAuth } from '../../context/AuthContext';
import { logoutSession } from './logout-session';
import { Alert } from 'react-native';

export function useRequestOtp() {
  return useMutation({ mutationFn: authApi.requestOtp });
}

export function useVerifyOtp() {
  return useMutation({ mutationFn: ({ phone, code }: { phone: string; code: string }) => authApi.verifyOtp(phone, code) });
}

export function useLogout() {
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: () => logoutSession(() => setUser(null)),
    onError: () => {
      Alert.alert('Server sign-out pending', 'You are signed out locally. Keep the app open after reconnecting to finish server sign-out. It will also retry before your next login.');
    },
  });
}
