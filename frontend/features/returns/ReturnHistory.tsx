import { ScrollView, Text, View } from 'react-native';
import { ReturnCase, statusLabels } from './return-types';
import { eventLabels } from './support-model';
import { ReturnPhotos } from './ReturnPhotos';
import { supportStyles as s } from './support.styles';

export function ReturnHistory({ record }: { record: ReturnCase }) {
  const events = record.history.filter((event) => !['message', 'reply'].includes(event.action));
  return <ScrollView contentContainerStyle={s.timeline}>
    {events.map((event, index) => <View key={event.id} style={s.event}>
      <View style={s.rail}><View style={s.dot} />{index < events.length - 1 && <View style={s.line} />}</View>
      <View style={s.eventBody}>
        <Text style={s.rowTitle}>{eventLabels[event.action] || statusLabels[event.status]}</Text>
        <Text style={s.meta}>{new Date(event.at).toLocaleString('en-IN')} · {event.actor === 'admin' ? 'Support team' : 'Customer'}</Text>
        <Text selectable style={s.preview}>{event.note}</Text>
        {!!event.photoIds.length && <ReturnPhotos orderId={record.orderId} ids={event.photoIds} />}
      </View>
    </View>)}
  </ScrollView>;
}
