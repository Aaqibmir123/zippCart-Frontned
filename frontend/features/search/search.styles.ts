import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const searchStyles = StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1, paddingHorizontal: 20 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14 },
  close: { width: 54 },
  closeText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  space: { width: 54 },
  inputWrap: { backgroundColor: colors.white, borderColor: colors.primary, borderRadius: 15, borderWidth: 1.5, height: 53, marginTop: 24, paddingHorizontal: 15 },
  input: { color: colors.ink, fontSize: 14, height: '100%' },
  infoTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  infoText: { color: colors.mutedText, fontSize: 13, lineHeight: 19, marginTop: 7 },
  results: { gap: 12, paddingTop: 18, paddingBottom: 30 },
  result: { backgroundColor: colors.white, borderRadius: 14, padding: 10, flexDirection: 'row', gap: 12, alignItems: 'center' },
  image: { width: 58, height: 58, borderRadius: 9, backgroundColor: '#EFF0F3' },
  resultText: { flex: 1 },
  more: { color: colors.primary, fontWeight: '800', textAlign: 'center', padding: 12 },
});
