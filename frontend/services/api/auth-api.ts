import { apiRequest } from "./client";

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
    apiRequest<OtpDelivery>("/auth/otp/request", { body: { phone } }),
  verifyOtp: (phone: string, code: string) =>
    apiRequest<{ message: string; user: AuthenticatedUser }>(
      "/auth/otp/verify",
      { body: { phone, code } },
    ),
  refresh: () =>
    apiRequest<{ message: string; user: AuthenticatedUser }>("/auth/refresh", { skipAuthRefresh: true }),
  logout: () => apiRequest<void>("/auth/logout", { skipAuthRefresh: true }),
  deleteAccount: (code: string) =>
    apiRequest<void>("/auth/account/delete", { body: { code } }),
};
