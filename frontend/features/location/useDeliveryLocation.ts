import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { detectDeliveryAddress, type DeliveryLocation } from './delivery-location';

const locationDebugEnabled = typeof __DEV__ === 'undefined' || __DEV__;
const debugLog = (...values: unknown[]) => {
  if (locationDebugEnabled) console.log(...values);
};

function logLocationError(error: unknown) {
  const details = error instanceof Error ? error : undefined;
  const fields = error && typeof error === 'object'
    ? error as { name?: unknown; message?: unknown; code?: unknown; cause?: unknown; stack?: unknown; status?: unknown }
    : {};
  debugLog('[location-debug] error-stage: delivery location hook before UI result');
  debugLog('[location-debug] error-name:', String(fields.name ?? details?.name));
  debugLog('[location-debug] error-code:', String(fields.code));
  debugLog('[location-debug] error-http-status:', String(fields.status));
  debugLog('[location-debug] error-message:', String(fields.message ?? details?.message));
  debugLog('[location-debug] error-cause:', String(fields.cause));
  debugLog('[location-debug] error-string:', String(error));
  debugLog('[location-debug] error-stack:', String(fields.stack ?? details?.stack));
}

export type DeliveryLocationState = DeliveryLocation | { status: 'idle' | 'loading' | 'error' };
const idle: DeliveryLocationState = { status: 'idle' };
export function useDeliveryLocation(userId: string | undefined, automatic: boolean, enabled = true) {
  const [record, setRecord] = useState<{ userId?: string; state: DeliveryLocationState }>({ userId, state: idle });
  const state = record.userId === userId ? record.state : idle;
  const request = useRef<AbortController | null>(null);
  const setState = useCallback((value: DeliveryLocationState) => setRecord({ userId, state: value }), [userId]);
  const cancel = useCallback(() => { request.current?.abort(); request.current = null; }, []);
  const run = useCallback(async (askPermission = true) => {
    if (!userId || !enabled || request.current || AppState.currentState !== 'active') return;
    const controller = new AbortController();
    request.current = controller;
    setState({ status: 'loading' });
    try {
      const result = await detectDeliveryAddress(controller.signal, askPermission);
      if (!controller.signal.aborted) setState(result);
    } catch (error) {
      logLocationError(error);
      if (!controller.signal.aborted) setState({ status: 'error' });
    }
    finally { if (request.current === controller) request.current = null; }
  }, [userId, enabled, setState]);
  useEffect(() => { setState(idle); return cancel; }, [userId, setState, cancel]);
  useEffect(() => {
    if (enabled && automatic && AppState.currentState === 'active') void run(false);
    else setRecord((current) => current.state.status === 'loading' ? { userId, state: idle } : current);
    return cancel;
  }, [automatic, enabled, userId, run, cancel]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        if (request.current) { cancel(); setState(idle); }
      } else if (next === 'active' && automatic && enabled && ['idle', 'permission', 'denied'].includes(state.status)) void run(false);
    });
    return () => subscription.remove();
  }, [automatic, enabled, state.status, run, cancel, setState]);
  return { state, locate: run };
}
