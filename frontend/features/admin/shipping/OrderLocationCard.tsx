import { Text, View } from 'react-native';
import { OrderLocation } from '../../location/location-types';
import { ss as s } from '../../seller/seller.styles';

export function OrderLocationCard({ location }: { location?: OrderLocation }) {
  const sample = location?.status === 'captured' ? location.sample : null;
  const message = location?.status === 'denied' ? 'Customer did not grant location permission.'
    : location?.status === 'unavailable' ? 'Device location could not be captured or securely saved.'
    : location?.status === 'skipped' ? 'Customer continued without sharing location.'
    : 'No device location was recorded for this order.';
  return <View style={s.card}>
    <Text style={s.title}>Order location</Text>
    {sample ? <>
      <Text selectable style={s.heading}>{sample.latitude.toFixed(6)}, {sample.longitude.toFixed(6)}</Text>
      <Text style={s.text}>{sample.accuracy === null ? 'Accuracy unavailable' : `Approximate accuracy: ${Math.round(sample.accuracy)} metres`}</Text>
      <Text style={s.small}>Captured {new Date(sample.capturedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</Text>
      <Text style={s.small}>Customer device location at checkout. It may differ from the delivery address and is not a verified delivery pin.</Text>
    </> : <Text style={s.small}>{message}</Text>}
  </View>;
}
