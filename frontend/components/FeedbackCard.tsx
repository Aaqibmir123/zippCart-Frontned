import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

type FeedbackCardProps = {
  message: string;
  title: string;
  tone: 'error' | 'success';
};

export function FeedbackCard({ message, title, tone }: FeedbackCardProps) {
  const isError = tone === 'error';
  return (
    <View style={[styles.card, isError ? styles.errorCard : styles.successCard]}>
      <View style={[styles.icon, isError ? styles.errorIcon : styles.successIcon]}>
        <Text style={styles.iconText}>{isError ? '!' : '✓'}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', marginTop: 20, padding: 14 },
  errorCard: { backgroundColor: '#FFF1F2', borderColor: '#FFD3D8', borderWidth: 1 },
  successCard: { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0', borderWidth: 1 },
  icon: { alignItems: 'center', borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  errorIcon: { backgroundColor: colors.error },
  successIcon: { backgroundColor: colors.success },
  iconText: { color: colors.white, fontSize: 17, fontWeight: '800' },
  copy: { flex: 1, marginLeft: 10 },
  title: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  message: { color: colors.mutedText, fontSize: 12, lineHeight: 17, marginTop: 2 },
});
