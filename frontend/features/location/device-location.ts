import * as Location from 'expo-location';
import { LocationCapture } from './location-types';

const locationDebugEnabled = typeof __DEV__ === 'undefined' || __DEV__;
const debugLog = (...values: unknown[]) => {
  if (locationDebugEnabled) console.log(...values);
};

export const getLocationPermission = () => Location.getForegroundPermissionsAsync();

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

// A short, removable foreground subscription avoids leaving GPS running after timeout.
export async function captureLocation(signal: AbortSignal): Promise<LocationCapture> {
  try {
    let permission = await getLocationPermission();
    debugLog('[location-debug] GPS permission result:', JSON.stringify({
      granted: permission.granted, status: permission.status, canAskAgain: permission.canAskAgain,
    }));
    if (signal.aborted) {
      debugLog('[location-debug] GPS acquisition skipped: request already aborted');
      return { status: 'unavailable' };
    }
    if (!permission.granted && permission.status === 'undetermined' && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
      debugLog('[location-debug] GPS permission request result:', JSON.stringify({
        granted: permission.granted, status: permission.status, canAskAgain: permission.canAskAgain,
      }));
    }
    if (!permission.granted) {
      debugLog('[location-debug] GPS acquisition stopped: permission not granted');
      return { status: 'denied' };
    }
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    debugLog('[location-debug] location services enabled:', String(servicesEnabled));
    if (signal.aborted || !servicesEnabled) {
      debugLog('[location-debug] GPS acquisition stopped:', signal.aborted ? 'request aborted' : 'location services disabled');
      return { status: 'unavailable' };
    }
    return await new Promise<LocationCapture>((resolve) => {
      let subscription: Location.LocationSubscription | undefined;
      let finished = false;
      const done = (result: LocationCapture) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        subscription?.remove();
        resolve(result);
      };
      const abort = () => done({ status: 'unavailable' });
      const timer = setTimeout(() => {
        debugLog('[location-debug] GPS location timeout');
        done({ status: 'unavailable' });
      }, 20_000);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) { abort(); return; }
      debugLog('[location-debug] GPS acquisition start: watchPositionAsync');
      void Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced,
        timeInterval: 1000, distanceInterval: 0, mayShowUserSettingsDialog: false }, (fix) => {
        const { latitude, longitude, accuracy } = fix.coords;
        const age = Date.now() - fix.timestamp;
        if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
          !Number.isFinite(age) || age < -15_000 || age > 15_000 ||
          (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000))) return;
        debugLog('[location-debug] GPS coordinates received:', JSON.stringify({
          valid: true, hasLatitude: Number.isFinite(latitude), hasLongitude: Number.isFinite(longitude),
          accuracy, fixAgeMs: age,
        }));
        debugLog('[location-debug] GPS acquisition success');
        done({ status: 'captured', sample: { latitude, longitude, accuracy, capturedAt: new Date(fix.timestamp).toISOString() } });
      }, (error) => {
        logLocationError('GPS location watch', error);
        done({ status: 'unavailable' });
      }).then((watcher) => {
        subscription = watcher;
        if (finished) watcher.remove();
      }).catch((error: unknown) => {
        logLocationError('GPS watch setup', error);
        done({ status: 'unavailable' });
      });
    });
  } catch (error) {
    logLocationError('GPS capture', error);
    return { status: 'unavailable' };
  }
}
