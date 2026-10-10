import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/ThemeProvider';

export function ProductGallery({ images, name, discount = 0 }: { images: string[]; name: string; discount?: number }) {
  const theme = useAppTheme();
  const [active, setActive] = useState(0);
  const current = Math.min(active, Math.max(0, images.length - 1));
  return <View>
    <View style={[s.gallery, { backgroundColor: theme.colors.raised }]}>
      {images.length ? <GalleryImage key={images[current]} uri={images[current]} label={`${name}, photo ${current + 1}`} placeholderColor={theme.colors.muted} /> : <Text style={[s.placeholder, { color: theme.colors.muted }]}>Photo unavailable</Text>}
      {discount > 0 && <Text style={s.discount}>{discount}% OFF</Text>}
      {images.length > 1 && <>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous photo" onPress={() => setActive((current + images.length - 1) % images.length)} style={[s.arrow, { backgroundColor: theme.colors.surface }, s.left]}><Text style={[s.arrowText, { color: theme.colors.text }]}>{'‹'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next photo" onPress={() => setActive((current + 1) % images.length)} style={[s.arrow, { backgroundColor: theme.colors.surface }, s.right]}><Text style={[s.arrowText, { color: theme.colors.text }]}>{'›'}</Text></Pressable>
      </>}
      {images.length > 1 && <View pointerEvents="none" style={s.counter}><Text style={s.counterText}>{current + 1} / {images.length}</Text></View>}
    </View>
    {images.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbnails}>
      {images.map((uri, index) => <Pressable key={`${index}-${uri}`} accessibilityRole="button"
        accessibilityLabel={`${name}, photo ${index + 1}`} accessibilityState={{ selected: current === index }}
      onPress={() => setActive(index)} style={[s.thumbnail, { backgroundColor: theme.colors.raised, borderColor: theme.colors.border }, current === index && s.activeThumbnail]}>
        <Image source={{ uri }} style={s.thumbnailImage} resizeMode="cover" />
      </Pressable>)}
    </ScrollView>}
  </View>;
}

function GalleryImage({ uri, label, placeholderColor }: { uri: string; label: string; placeholderColor: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <Text style={[s.placeholder, { color: placeholderColor }]}>Photo unavailable</Text>
    : <Image accessibilityLabel={label} source={{ uri }} onError={() => setFailed(true)} style={s.image} resizeMode="contain" />;
}

const s = StyleSheet.create({
  gallery: { width: '100%', aspectRatio: 1.12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3EDF4', borderRadius: 12, overflow: 'hidden' },
  discount: { position: 'absolute', top: 12, right: 12, color: '#F16A35', backgroundColor: '#FFFFFF', fontSize: 11, fontWeight: '800', padding: 8, borderRadius: 8 },
  arrow: { position: 'absolute', top: '44%', width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFFEE', justifyContent: 'center', alignItems: 'center' },
  left: { left: 10 }, right: { right: 10 }, arrowText: { fontSize: 29, lineHeight: 32, color: '#25213A' },
  image: { width: '100%', height: '100%' },
  placeholder: { color: '#99909F', fontSize: 12 },
  counter: { position: 'absolute', bottom: 14, right: 14, backgroundColor: '#FFFFFFE6', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  counterText: { color: '#6F6378', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  thumbnails: { flexDirection: 'row', gap: 8, marginTop: 10 },
  thumbnail: { width: 48, height: 56, borderRadius: 9, borderWidth: 1, borderColor: '#E8E1E7', overflow: 'hidden', backgroundColor: '#F5F2F6' },
  activeThumbnail: { borderColor: '#8B2CFF', borderWidth: 2 },
  thumbnailImage: { width: '100%', height: '100%' },
  more: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#29232DB5' },
  moreText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
