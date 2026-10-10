import * as Location from 'expo-location';
import { captureLocation } from './device-location';
import { locationApi } from '../../services/api/location-api';
import type { AddressInput } from '../../services/api/address-api';

const locationDebugEnabled = typeof __DEV__ === 'undefined' || __DEV__;
const debugLog = (...values: unknown[]) => {
  if (locationDebugEnabled) console.log(...values);
};

export type DetectedAddress = Pick<AddressInput, 'locality' | 'district' | 'city' | 'state' | 'pincode'>;
export type DeliveryLocation =
  | { status: 'ready'; address: DetectedAddress }
  | { status: 'permission' | 'denied' | 'unavailable' | 'no_address' | 'outside_india' };

function logLocationError(stage: string, error: unknown) {
  const details = error instanceof Error ? error : undefined;
  const fields = error && typeof error === 'object'
    ? error as { name?: unknown; message?: unknown; code?: unknown; cause?: unknown; stack?: unknown; status?: unknown }
    : {};
  debugLog('[location-debug] error-stage:', stage);
  debugLog('[location-debug] error-name:', String(fields.name ?? details?.name));
  debugLog('[location-debug] error-code:', String(fields.code));
  debugLog('[location-debug] error-http-status:', String(fields.status));
  debugLog('[location-debug] error-message:', String(fields.message ?? details?.message));
  debugLog('[location-debug] error-cause:', String(fields.cause));
  debugLog('[location-debug] error-string:', String(error));
  debugLog('[location-debug] error-stack:', String(fields.stack ?? details?.stack));
}

export async function detectDeliveryAddress(signal: AbortSignal, askPermission = false): Promise<DeliveryLocation> {
  const cancelled = () => { if (signal.aborted) throw new Error('Location request cancelled.'); };
  cancelled();
  let permission;
  try {
    permission = await Location.getForegroundPermissionsAsync();
  } catch (error) {
    logLocationError('delivery permission lookup', error);
    throw error;
  }
  debugLog('[location-debug] delivery permission result:', JSON.stringify({
    granted: permission.granted, status: permission.status, canAskAgain: permission.canAskAgain,
  }));
  cancelled();
  if (!permission.granted) {
    if (!askPermission) return { status: permission.status === 'denied' ? 'denied' : 'permission' };
    if (!permission.canAskAgain) return { status: 'denied' };
    try {
      permission = await Location.requestForegroundPermissionsAsync();
    } catch (error) {
      logLocationError('delivery permission request', error);
      throw error;
    }
    debugLog('[location-debug] delivery permission request result:', JSON.stringify({
      granted: permission.granted, status: permission.status, canAskAgain: permission.canAskAgain,
    }));
    cancelled();
    if (!permission.granted) return { status: 'denied' };
  }
  const capture = await captureLocation(signal);
  debugLog('[location-debug] GPS capture result:', capture.status);
  cancelled();
  if (capture.status !== 'captured') {
    const status = capture.status === 'denied' ? 'denied' : 'unavailable';
    debugLog('[location-debug] delivery location UI status:', status);
    return { status };
  }
  debugLog('[location-debug] backend reverse-geocode request: start');
  let result;
  try {
    result = await locationApi.reverseGeocode({
      latitude: capture.sample.latitude,
      longitude: capture.sample.longitude,
    }, signal);
  } catch (error) {
    logLocationError('backend reverse-geocode request', error);
    throw error;
  }
  debugLog('[location-debug] backend reverse-geocode response:', JSON.stringify({
    hasAddress: Boolean(result.address),
    countryCode: result.countryCode ?? 'none',
    hasLocality: Boolean(result.address?.locality),
    hasCity: Boolean(result.address?.city),
    hasState: Boolean(result.address?.state),
    hasPincode: Boolean(result.address?.pincode),
  }));
  cancelled();
  if (!result.address) return { status: 'no_address' };
  if (result.countryCode && result.countryCode.toUpperCase() !== 'IN') return { status: 'outside_india' };
  const address = result.address;
  return Object.values(address).some(Boolean) ? { status: 'ready', address } : { status: 'no_address' };
}
