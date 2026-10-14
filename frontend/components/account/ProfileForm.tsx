import { AppLoader } from '../AppLoader';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadPublicImage } from '../../services/media/image-upload';
import { getSessionScope, assertUserSession } from '../../services/auth/session-scope';
import { useProfile } from '../../hooks/useProfile';
import { AuthenticatedUser } from '../../services/api/auth-api';
import { ProfileAvatar } from './ProfileAvatar';

export function ProfileForm({ onSaved }: { onSaved: () => void }) {
  const { query, mutation } = useProfile();
  if (query.isPending) return <AppLoader accessibilityLabel="Loading profile" style={{ padding: 40 }} color="#6366F1" />;
  if (query.isError) return <View style={s.form}><Text style={s.error}>Could not load your profile.</Text><Pressable onPress={() => void query.refetch()} style={s.small}><Text style={s.link}>Try again</Text></Pressable></View>;
  return <ProfileFields user={query.data.user} pending={mutation.isPending} onSave={async (data) => { await mutation.mutateAsync(data); onSaved(); }} />;
}
function ProfileFields({ user, pending, onSave }: { user: AuthenticatedUser; pending: boolean; onSave: (data: { fullName: string; email: string; profileImage: string | null }) => Promise<void> }) {
  const [fullName, setFullName] = useState(user.fullName ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [photo, setPhoto] = useState(user.profileImage ?? null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const busy = pending || picking;
  async function pickPhoto() {
    const session = getSessionScope();
    setPicking(true); setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
      if (result.canceled) return;
      const uploaded = await uploadPublicImage(result.assets[0], session, '/media/profile', 512);
      assertUserSession(session);
      setPhoto(uploaded);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not open this photo.'); }
    finally { setPicking(false); }
  }
  async function submit() {
    setError('');
    if (fullName.trim().length < 2) { setError('Please enter your full name.'); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return; }
    try { await onSave({ fullName: fullName.trim(), email: email.trim(), profileImage: photo }); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not save profile. Please try again.'); }
  }
  return <View style={s.form}>
    <View style={s.avatar}><ProfileAvatar size={92} uri={photo} /><Pressable disabled={busy} onPress={() => void pickPhoto()} style={s.small}>{picking ? <AppLoader color="#6366F1" /> : <Text style={s.link}>Choose photo</Text>}</Pressable>{photo && <Pressable disabled={busy} onPress={() => setPhoto(null)} style={s.small}><Text style={s.remove}>Remove photo</Text></Pressable>}</View>
    <Text style={s.label}>Mobile number</Text><View style={s.phone}><Text style={s.prefix}>+91</Text><TextInput accessibilityLabel="Login mobile number, read only" editable={false} value={user.phone.slice(-10)} style={s.number} /></View>
    <Text style={s.label}>Full name</Text><TextInput accessibilityLabel="Full name" editable={!busy} value={fullName} onChangeText={setFullName} maxLength={80} autoComplete="name" placeholder="Enter full name" style={s.input} />
    <Text style={s.label}>Email</Text><TextInput accessibilityLabel="Email" editable={!busy} value={email} onChangeText={setEmail} maxLength={254} autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="you@example.com" style={s.input} />
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={[s.save, busy && { opacity: 0.6 }]}>{pending ? <AppLoader color="white" /> : <Text style={s.saveText}>Save profile</Text>}</Pressable>
  </View>;
}
const s = StyleSheet.create({
  form: { padding: 22 }, avatar: { alignItems: 'center', marginBottom: 12 }, small: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14 }, link: { color: '#6860A4', fontSize: 12, fontWeight: '700' }, remove: { color: '#AD677A', fontSize: 11 }, label: { color: '#44506A', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 16 }, input: { borderRadius: 14, borderWidth: 1, borderColor: '#DDDCE7', backgroundColor: 'white', color: '#354159', padding: 14, fontSize: 14 }, phone: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECEEF3', borderRadius: 14, paddingHorizontal: 14 }, prefix: { color: '#737D90', paddingRight: 12, borderRightWidth: 1, borderRightColor: '#CCD1DB', fontSize: 14 }, number: { flex: 1, padding: 14, color: '#8A93A5', fontSize: 14 }, error: { color: '#B25365', fontSize: 12, lineHeight: 18, marginTop: 12 }, save: { backgroundColor: '#50567F', borderRadius: 15, alignItems: 'center', minHeight: 52, justifyContent: 'center', marginTop: 24 }, saveText: { color: 'white', fontWeight: '700' },
});
