import { AppLoader } from '../../components/AppLoader';
import { useRef, useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useAuth } from '../../context/AuthContext';
import { returnApi } from './return-api';
import { rs as s } from './return.styles';

export function ReturnPhoto({ orderId, id }: { orderId: string; id: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ['return-photo', user?.id, orderId, id],
    queryFn: () => returnApi.photo(orderId, id), gcTime: 0, retry: 1 });
  if (query.isPending) return <View style={s.photo}><AppLoader /></View>;
  if (query.isError) return <Pressable onPress={() => void query.refetch()} style={s.photo}><Text style={s.error}>Photo failed. Retry</Text></Pressable>;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="View proof photo" onPress={() => setOpen(true)}>
      <Image source={{ uri: query.data.data }} style={s.photo} />
    </Pressable>
    <Modal visible={open} onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={s.page}><Pressable onPress={() => setOpen(false)} style={s.secondary}><Text style={s.link}>Close photo</Text></Pressable>
        <Image source={{ uri: query.data.data }} style={s.flex} resizeMode="contain" />
      </SafeAreaView>
    </Modal>
  </>;
}
export function ReturnPhotos({ orderId, ids, onChange, disabled = false, onBusy }: {
  orderId: string; ids: string[]; onChange?: (ids: string[]) => void; disabled?: boolean; onBusy?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function choose(camera: boolean) {
    if (lock.current || disabled || ids.length >= 5) return;
    lock.current = true; setBusy(true); onBusy?.(true); setError('');
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
        throw new Error('Allow camera access, or choose a photo from your gallery.');
      const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) throw new Error('Choose a photo smaller than 10 MB.');
      const context = ImageManipulator.manipulate(asset.uri);
      try {
        context.resize(asset.width >= asset.height ? { width: Math.min(1200, asset.width) } : { height: Math.min(1200, asset.height) });
        const image = await context.renderAsync();
        try {
          const photo = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
          if (!photo.base64 || photo.base64.length > 680000) throw new Error('Photo is too large. Try a closer, simpler photo.');
          const uploaded = await returnApi.upload(orderId, `data:image/jpeg;base64,${photo.base64}`);
          onChange?.([...new Set([...ids, uploaded.id])]);
        } finally { image.release(); }
      } finally { context.release(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Photo upload failed. Try again.'); }
    finally { lock.current = false; setBusy(false); onBusy?.(false); }
  }
  return <View style={{ gap: 10 }}>
    <View style={s.row}>{ids.map((id) => <View key={id} style={{ gap: 5 }}>
      <ReturnPhoto orderId={orderId} id={id} />
      {onChange && <Pressable disabled={disabled || busy} onPress={() => onChange(ids.filter((value) => value !== id))}>
        <Text style={s.link}>Remove</Text></Pressable>}
    </View>)}</View>
    {onChange && ids.length < 5 && <View style={s.row}>
      <Pressable disabled={disabled || busy} onPress={() => void choose(true)} style={s.secondary}><Text style={s.link}>Take photo</Text></Pressable>
      <Pressable disabled={disabled || busy} onPress={() => void choose(false)} style={s.secondary}><Text style={s.link}>Choose photo</Text></Pressable>
      {busy && <AppLoader />}
    </View>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}
