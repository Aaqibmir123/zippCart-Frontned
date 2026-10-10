import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileAvatar } from './ProfileAvatar';

type Props = { title: string; isPage: boolean; name?: string; phone?: string; image?: string | null;
  onClose: () => void; onProfile: () => void };

export function AccountDrawerHeader({ title, isPage, name, phone, image, onClose, onProfile }: Props) {
  return <LinearGradient colors={['#402562', '#8044A6', '#B3549D']}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
    <View pointerEvents="none" style={s.circle} />
    <View style={s.top}>
      <Text style={s.title}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={isPage ? 'Back to account menu' : 'Close account menu'}
        onPress={onClose} style={({ pressed }) => [s.close, pressed && { opacity: 0.65 }]}>
        <Text style={s.closeText}>{isPage ? '\u2039' : '\u00d7'}</Text>
      </Pressable>
    </View>
    {!isPage && <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={onProfile} style={s.profile}>
      <ProfileAvatar uri={image} size={58} />
      <View style={s.copy}>
        <Text numberOfLines={2} style={s.name}>{name || 'Your profile'}</Text>
        {!!phone && <Text style={s.phone}>{'+91 ' + phone.slice(-10)}</Text>}
      </View>
      <Text accessible={false} style={s.chevron}>{'\u203a'}</Text>
    </Pressable>}
  </LinearGradient>;
}

const s = StyleSheet.create({
  header: { margin: 12, marginBottom: 2, padding: 18, borderRadius: 24, overflow: 'hidden', gap: 20 },
  circle: { position: 'absolute', width: 175, height: 175, borderRadius: 90, borderColor: '#FFFFFF20',
    borderWidth: 26, top: -80, right: -55 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  close: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF1F' },
  closeText: { color: '#FFFFFF', fontSize: 28 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6 },
  copy: { flex: 1, minWidth: 0 },
  name: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  phone: { color: '#EFE0FA', fontSize: 12, marginTop: 5 },
  chevron: { color: '#FFFFFF', fontSize: 25 },
});
