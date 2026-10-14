import { apiRequest } from "./client";
import { withCredentialLock } from '../auth/credential-lock';
import { assertCurrentSession, getSessionScope } from '../auth/session-scope';

export type AuthenticatedUser = {
  id: string;
  phone: string;
  createdAt: string;
  fullName?: string;
  email?: string;
  profileImage?: string | null;
  roles?: ("customer" | "seller" | "admin")[];
  storeStatus?: "none" | "pending" | "approved" | "rejected";
  isActive?: boolean;
  mode?: "customer" | "seller";
};

export type OtpDelivery = {
  message: string;
  delivery: 'console' | 'sms' | '2factor';
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

export const authApi = {
  me: () =>
    apiRequest<{ user: AuthenticatedUser }>("/auth/me", { method: "GET" }),
  switchMode: (mode: "customer" | "seller") =>
    apiRequest<{ user: AuthenticatedUser }>("/auth/mode", { body: { mode } }),
  requestOtp: (phone: string) =>
    apiRequest<OtpDelivery>("/auth/otp/request", { body: { phone }, timeoutMs: 15000 }),
  verifyOtp: async (phone: string, code: string) => {
    const session = getSessionScope();
    return withCredentialLock(async () => {
      assertCurrentSession(session);
      const { clearPendingLogout, hasPendingLogout } = await import('../auth/session-storage');
      if (await hasPendingLogout()) {
        assertCurrentSession(session);
        await authApi.logout();
        assertCurrentSession(session);
        await clearPendingLogout();
      }
      assertCurrentSession(session);
      return apiRequest<{ message: string; user: AuthenticatedUser }>(
        "/auth/otp/verify",
        { body: { phone, code } },
      );
    });
  },
  refresh: () =>
    apiRequest<{ message: string; user: AuthenticatedUser }>("/auth/refresh", { skipAuthRefresh: true }),
  logout: () => apiRequest<void>("/auth/logout", { skipAuthRefresh: true }),
  deleteAccount: (code: string) =>
    apiRequest<void>("/auth/account/delete", { body: { code } }),
};
