import { StyleSheet } from 'react-native';
export const reviewStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8F5FC' }, content: { padding: 16, gap: 14, paddingBottom: 32 },
  section: { marginTop: 12, borderWidth: 1, borderColor: '#E9DFF4', backgroundColor: '#FFF8FC', borderRadius: 16, padding: 15, gap: 12 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 14, borderWidth: 1, borderColor: '#EAE4F0', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }, between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { fontSize: 17, fontWeight: '800', color: '#29213E' }, text: { color: '#4D435D', fontSize: 13, lineHeight: 20 },
  muted: { color: '#847A92', fontSize: 11, lineHeight: 17 }, link: { color: '#7139F5', fontWeight: '700', fontSize: 13 },
  verified: { color: '#148453', fontSize: 11, fontWeight: '700' }, stars: { color: '#148453', fontSize: 19 },
  input: { borderWidth: 1, borderColor: '#DACFE7', borderRadius: 10, padding: 12, color: '#29213E', backgroundColor: '#fff', minHeight: 44 },
  button: { backgroundColor: '#7139F5', padding: 13, borderRadius: 10, alignItems: 'center', minHeight: 46 }, buttonText: { color: '#fff', fontWeight: '800' },
  secondary: { backgroundColor: '#EFE7FC', padding: 11, borderRadius: 10, alignItems: 'center' },
  photo: { width: 64, height: 76, borderRadius: 8, backgroundColor: '#ECE5F4' }, error: { color: '#B52D46', fontSize: 12 },
  reply: { padding: 12, backgroundColor: '#F4EFFA', borderRadius: 10, gap: 4 }, disabled: { opacity: 0.5 },
});
