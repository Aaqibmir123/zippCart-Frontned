import { AppLoader } from '../../components/AppLoader';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { ReturnCase, ReturnEvent, statusLabels } from './return-types';
import { ReturnPhotos } from './ReturnPhotos';
import { eventLabels, isChatMessage } from './support-model';
import { useConversation } from './useConversation';
import { supportStyles as s } from './support.styles';
import { rs } from './return.styles';

export function ReturnConversation({ record, admin = false, active = true }: {
  record: ReturnCase; admin?: boolean; active?: boolean;
}) {
  const chat = useConversation(record, admin, active);
  const messages = useMemo(() => [...record.history].reverse(), [record.history]);
  const list = useRef<FlatList<ReturnEvent>>(null);
  const followLatest = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  function goLatest(animated = true) {
    followLatest.current = true;
    setShowLatest(false);
    list.current?.scrollToOffset({ offset: 0, animated });
  }
  async function send() {
    if (await chat.send()) goLatest();
  }
  return <View style={s.flex}>
    <FlatList ref={list} inverted data={messages} keyExtractor={(event) => event.id}
      contentContainerStyle={s.messages} keyboardShouldPersistTaps="handled"
      onLayout={() => { if (active && followLatest.current) goLatest(false); }}
      onContentSizeChange={() => { if (active && followLatest.current) goLatest(false); }}
      scrollEventThrottle={100}
      onScroll={({ nativeEvent: { contentOffset } }) => {
        followLatest.current = contentOffset.y < 100;
        setShowLatest(!followLatest.current);
      }}
      ListFooterComponent={<Text style={s.date}>Conversation with {admin ? 'customer' : 'JhelumKart support'}</Text>}
      renderItem={({ item: event, index }) => {
        const own = event.actor === (admin ? 'admin' : 'customer');
        const message = isChatMessage(event);
        const date = new Date(event.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const previous = messages[index + 1];
        const newDay = !previous || new Date(previous.at).toDateString() !== new Date(event.at).toDateString();
        return <View>
          {newDay && <Text style={s.date}>{date}</Text>}
          <View style={message ? [s.bubble, own ? s.own : s.other] : s.update}>
            <Text style={s.author}>{message ? (own ? 'You' : admin ? 'Customer' : 'Support team')
              : eventLabels[event.action] || statusLabels[event.status]}</Text>
            <Text selectable style={s.message}>{event.note}</Text>
            {!!event.photoIds.length && <ReturnPhotos orderId={record.orderId} ids={event.photoIds} />}
            <Text style={s.time}>{new Date(event.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</Text>
          </View>
        </View>;
      }}
      ListHeaderComponent={chat.seen.isError ? <Pressable onPress={() => chat.markRead()} style={s.notice}>
        <Text style={rs.error}>Could not mark updates as read. Tap to retry.</Text>
      </Pressable> : null} />
    {showLatest && <Pressable accessibilityRole="button" style={s.latest} onPress={() => goLatest()}>
      <Text style={s.status}>Jump to latest ↓</Text>
    </Pressable>}
    {chat.closed ? <View style={s.composer}>
      <Text style={s.subtitle}>This request is closed. Your chat and history are saved here.</Text>
    </View> : <View style={s.composer}>
      {!admin && record.status === 'information_needed' && <Text style={s.status}>
        Reply requested{record.proofDueAt ? ' by ' + new Date(record.proofDueAt).toLocaleDateString('en-IN') : ''}
      </Text>}
      {chat.attach && <ReturnPhotos orderId={record.orderId} ids={chat.photos} onChange={chat.setPhotos}
        onBusy={chat.setPhotoBusy} disabled={chat.mutation.isPending} />}
      <View style={s.composerRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={chat.attach ? 'Hide photo attachments' : 'Attach photos'}
          accessibilityState={{ expanded: chat.attach, disabled: chat.mutation.isPending || chat.photoBusy }}
          disabled={chat.mutation.isPending || chat.photoBusy} style={s.attach} onPress={() => chat.setAttach(!chat.attach)}>
          <Text style={s.attachmentText}>{chat.attach ? '−' : '+'}</Text>
        </Pressable>
        <TextInput accessibilityLabel={admin ? 'Message to customer' : 'Message to support'}
          placeholder="Write a message…" placeholderTextColor="#8A7F95" style={s.input}
          value={chat.note} onChangeText={chat.setNote} multiline maxLength={1000} editable={!chat.mutation.isPending} />
        <Pressable accessibilityRole="button" accessibilityLabel="Send message"
          accessibilityState={{ disabled: !chat.canSend, busy: chat.mutation.isPending }}
          disabled={!chat.canSend} onPress={() => void send()} style={[s.send, !chat.canSend && rs.disabled]}>
          {chat.mutation.isPending ? <AppLoader color="#fff" /> : <Text style={s.sendText}>Send</Text>}
        </Pressable>
      </View>
      {!!chat.photos.length && !chat.attach && <Text style={s.meta}>{chat.photos.length} photo(s) attached</Text>}
      {chat.note.length > 0 && chat.note.trim().length < 3 && <Text style={s.meta}>Write at least 3 characters to send.</Text>}
      {chat.mutation.isError && <Text accessibilityRole="alert" style={rs.error}>{chat.mutation.error.message} Your draft is saved here. Tap Send to retry.</Text>}
    </View>}
  </View>;
}
