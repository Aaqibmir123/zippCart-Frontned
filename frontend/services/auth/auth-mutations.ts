import { useMutation } from '@tanstack/react-query';

import { authApi } from '../api/auth-api';
import { clearSessionMayExist } from './session-storage';

export function useRequestOtp() {
  return useMutation({ mutationFn: authApi.requestOtp });
}

export function useVerifyOtp() {
  return useMutation({ mutationFn: ({ phone, code }: { phone: string; code: string }) => authApi.verifyOtp(phone, code) });
}

export function useLogout() {
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: async () => {
      await clearSessionMayExist().catch(() => console.warn('[auth] session_marker_clear_error'));
    },
  });
}
