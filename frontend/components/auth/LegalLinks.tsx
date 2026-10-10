import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { onTerms: () => void; onPrivacy: () => void; disabled?: boolean };

export function LegalLinks({ onTerms, onPrivacy, disabled }: Props) {
  return (
    <View style={s.footer}>
      <View style={s.links}>
        <Pressable accessibilityRole="link" disabled={disabled} onPress={onTerms} style={({ pressed }) => [s.link, pressed && s.pressed]}>
          <Text style={s.label}>Terms & Conditions</Text>
        </Pressable>
        <Text accessible={false} style={s.separator}>|</Text>
        <Pressable accessibilityRole="link" disabled={disabled} onPress={onPrivacy} style={({ pressed }) => [s.link, pressed && s.pressed]}>
          <Text style={s.label}>Privacy Policy</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  footer: { marginTop: 0, marginBottom: 6 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 8 },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 },
  pressed: { opacity: 0.55 },
  label: { color: '#148536', fontSize: 11, fontWeight: '600', textDecorationLine: 'underline' },
  separator: { color: '#BACDBF', fontSize: 12 },
});
