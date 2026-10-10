import { useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";
import { palette, s } from "./registration.styles";

type Props = TextInputProps & { label: string; error?: string; hint?: string };
export function FormField({ label, error, hint, ...input }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        accessibilityHint={error || hint}
        placeholderTextColor="#A0A5B5"
        selectionColor={palette.accent}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          s.input,
          input.multiline && s.multiline,
          focused && s.focused,
          !!error && s.invalid,
        ]}
      />
      {!!error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : (
        !!hint && <Text style={s.hint}>{hint}</Text>
      )}
    </View>
  );
}
