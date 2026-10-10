import { createContext, PropsWithChildren, useContext, useEffect, useRef } from 'react';
import { captureLocation } from './device-location';
import { LocationCapture } from './location-types';

const Context = createContext<{ requestForCheckout: () => Promise<LocationCapture> } | null>(null);

export function LocationProvider({ children }: PropsWithChildren) {
  const active = useRef(false);
  const abort = useRef(new AbortController());
  const pending = useRef<Promise<LocationCapture> | null>(null);

  useEffect(() => {
    active.current = true;
    abort.current = new AbortController();
    return () => {
      active.current = false;
      abort.current.abort();
      pending.current = null;
    };
  }, []);

  function requestForCheckout(): Promise<LocationCapture> {
    if (!active.current) return Promise.reject(new Error('Location request cancelled.'));
    if (pending.current) return pending.current;
    const signal = abort.current.signal;
    // Checkout asks through the OS. Denial/unavailability must not block orders.
    const request = captureLocation(signal).then((capture) => {
      if (signal.aborted || !active.current) throw new Error('Location request cancelled.');
      return capture;
    }).finally(() => {
      if (pending.current === request) pending.current = null;
    });
    pending.current = request;
    return request;
  }

  return <Context.Provider value={{ requestForCheckout }}>{children}</Context.Provider>;
}

export function useCheckoutLocation() {
  const value = useContext(Context);
  if (!value) throw new Error('Checkout must be inside LocationProvider.');
  return value;
}
