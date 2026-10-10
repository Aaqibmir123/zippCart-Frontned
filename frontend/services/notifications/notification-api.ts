import { apiRequest } from '../api/client';

export type DeviceRegistration = { token: string; platform: 'android' | 'ios'; deviceId?: string | null };

export const notificationApi = {
  registerDevice: (input: DeviceRegistration, signal?: AbortSignal) => apiRequest<void>('/notifications/devices', { method: 'POST', body: input, signal }),
  removeDevice: (token: string) => apiRequest<void>('/notifications/devices', { method: 'DELETE', body: { token } }),
};
