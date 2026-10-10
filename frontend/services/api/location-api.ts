import { apiRequest } from './client';

export type ReverseGeocodeAddress = {
  locality: string;
  district: string;
  city: string;
  state: string;
  pincode: string;
};

type ReverseGeocodeResponse = {
  address: ReverseGeocodeAddress | null;
  countryCode: string | null;
};

export const locationApi = {
  reverseGeocode: (coordinates: { latitude: number; longitude: number }, signal: AbortSignal) =>
    apiRequest<ReverseGeocodeResponse>('/location/reverse-geocode', {
      method: 'POST',
      body: coordinates,
      signal,
      timeoutMs: 8000,
    }),
};
