import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { returnApi, useReturnAction } from './return-api';
import { closedStatuses, requestKey, ReturnCase } from './return-types';

export function useConversation(record: ReturnCase, admin: boolean, active: boolean) {
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [attach, setAttach] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const key = useRef(requestKey());
  const lastAttempt = useRef('');
  const lock = useRef(false);
  const client = useQueryClient();
  const mutation = useReturnAction(record, admin);
  const seen = useMutation({
    mutationFn: () => returnApi.read(record, admin), retry: 1,
    onSuccess: () => Promise.all(['return-cases', 'return-inbox', 'return-admin'].map((name) =>
      client.invalidateQueries({ queryKey: [name] }))),
  });
  const markRead = seen.mutate;
  useEffect(() => {
    if (active && record.unread) markRead();
  }, [active, record.id, record.version, record.unread, markRead]);
  const closed = closedStatuses.includes(record.status);
  const canSend = !closed && !photoBusy && !mutation.isPending && note.trim().length >= 3;

  async function send() {
    if (lock.current || !canSend) return false;
    lock.current = true;
    const fingerprint = JSON.stringify({ note: note.trim(), photos });
    if (lastAttempt.current && lastAttempt.current !== fingerprint) key.current = requestKey();
    lastAttempt.current = fingerprint;
    try {
      await mutation.mutateAsync({
        action: !admin && ['information_needed', 'inspection_disputed'].includes(record.status) ? 'reply' : 'message',
        version: record.version, clientKey: key.current, note: note.trim(), photoIds: photos,
      });
      key.current = requestKey();
      lastAttempt.current = '';
      setNote(''); setPhotos([]); setAttach(false);
      return true;
    } catch {
      // Preserve the draft and idempotency key for a safe retry after a lost response.
      return false;
    } finally { lock.current = false; }
  }
  return { note, setNote, photos, setPhotos, attach, setAttach, photoBusy, setPhotoBusy,
    closed, canSend, send, mutation, seen, markRead };
}
