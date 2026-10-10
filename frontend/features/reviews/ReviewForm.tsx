import { AppLoader } from '../../components/AppLoader';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { reviewApi } from './review-api';
import { reviewStyles as s } from './review.styles';
export function ReviewForm({ orderId, itemIndex, name, onClose }: { orderId: string; itemIndex: number; name: string; onClose: () => void }) {
  const client = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const save = useMutation({ mutationFn: () => reviewApi.create({ orderId, itemIndex, rating, title, comment, images }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['reviews'] }); onClose(); } });
  async function choosePhoto() {
    if (photoBusy || save.isPending || images.length >= 3) return;
    setPhotoBusy(true); setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
      const context = ImageManipulator.manipulate(asset.uri);
      try {
        context.resize(asset.width >= asset.height ? { width: Math.min(1200, asset.width) } : { height: Math.min(1200, asset.height) });
        const rendered = await context.renderAsync();
        try {
          const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
          if (!image.base64 || image.base64.length > 680000) throw new Error('Photo is too large. Choose a smaller photo.');
          setImages((current) => [...current, `data:image/jpeg;base64,${image.base64}`].slice(0, 3));
        } finally { rendered.release(); }
      } finally { context.release(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not prepare photo.'); }
    finally { setPhotoBusy(false); }
  }
  const disabled = save.isPending || photoBusy;
  return <Modal visible animationType="slide" onRequestClose={() => { if (!disabled) onClose(); }}>
    <SafeAreaView style={s.page}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <View style={s.between}><Text style={s.title}>Rate Product</Text><Pressable disabled={disabled} onPress={onClose}><Text style={s.link}>Close</Text></Pressable></View>
      <Text style={s.text}>{name}</Text><Text style={s.verified}>From your delivered order</Text>
      <View style={s.row}>{[1, 2, 3, 4, 5].map((star) => <Pressable key={star} accessibilityRole="button" accessibilityLabel={`Rate ${star} stars`} accessibilityState={{ selected: rating === star }} disabled={disabled} onPress={() => setRating(star)} style={{ padding: 6 }}><Text style={{ fontSize: 36, color: star <= rating ? '#F0B429' : '#BFB5CB' }}>★</Text></Pressable>)}</View>
      <TextInput accessibilityLabel="Review title" placeholder="Title (optional)" value={title} onChangeText={setTitle} maxLength={100} editable={!disabled} style={s.input} />
      <TextInput accessibilityLabel="Review comment" placeholder="Tell other shoppers about the product" value={comment} onChangeText={setComment} maxLength={2000} multiline editable={!disabled} style={[s.input, { minHeight: 130, textAlignVertical: 'top' }]} />
      <View style={s.row}>{images.map((image, index) => <View key={index}><Image source={{ uri: image }} style={s.photo} /><Pressable disabled={disabled} onPress={() => setImages(images.filter((_, i) => i !== index))}><Text style={s.link}>Remove</Text></Pressable></View>)}</View>
      {images.length < 3 && <Pressable disabled={disabled} style={s.secondary} onPress={() => void choosePhoto()}><Text style={s.link}>{photoBusy ? 'Preparing photo…' : 'Add photo (up to 3)'}</Text></Pressable>}
      <Text style={s.muted}>Photos and your first name will be public. Avoid including personal information.</Text>
      {!!(error || save.error) && <Text accessibilityRole="alert" style={s.error}>{error || save.error?.message}</Text>}
      <Pressable accessibilityRole="button" disabled={disabled || !rating || comment.trim().length < 5} style={[s.button, (disabled || !rating || comment.trim().length < 5) && s.disabled]} onPress={() => save.mutate()}>{save.isPending ? <AppLoader color="#fff" /> : <Text style={s.buttonText}>Submit review</Text>}</Pressable>
    </ScrollView></SafeAreaView>
  </Modal>;
}
