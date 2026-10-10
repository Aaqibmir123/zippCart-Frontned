import { StyleSheet } from 'react-native';
export const ds = StyleSheet.create({
  content: { padding: 16, gap: 18, paddingBottom: 30 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { color: '#281840', fontSize: 23, fontWeight: '800' }, heading: { color: '#302140', fontSize: 16, fontWeight: '800' },
  muted: { color: '#85758E', fontSize: 11, lineHeight: 17 }, text: { color: '#4A3B5B', fontSize: 13, lineHeight: 19 },
  link: { color: '#7139F5', fontSize: 12, fontWeight: '700' }, card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EBE4F3', borderRadius: 20, padding: 16, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, tile: { width: '48%', flexGrow: 1, borderRadius: 16, padding: 14, minHeight: 90, gap: 5 },
  number: { fontSize: 27, fontWeight: '900' }, tileLabel: { fontSize: 12, fontWeight: '700' },
  periods: { flexDirection: 'row', backgroundColor: '#EDE5F7', borderRadius: 13, padding: 4, gap: 4 },
  period: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' }, active: { backgroundColor: '#FFF' },
  hero: { borderRadius: 22, padding: 20, backgroundColor: '#38205E', gap: 8 }, heroLabel: { color: '#DBCAEF', fontSize: 12 },
  heroValue: { color: '#FFF', fontSize: 32, fontWeight: '900' }, heroText: { color: '#EEE3FF', fontSize: 12 },
  rank: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#F0E8FF', color: '#7139F5', textAlign: 'center', textAlignVertical: 'center', lineHeight: 30, fontWeight: '800' },
  separator: { borderTopWidth: 1, borderTopColor: '#F0EAF5', paddingTop: 12 },
  pill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden', fontSize: 10, fontWeight: '700' },
  bars: { flexDirection: 'row', height: 100, alignItems: 'flex-end', gap: 4 }, bar: { flex: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#8C57EB' },
  error: { color: '#AF304A', fontSize: 12 },
});
