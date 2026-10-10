import { AppLoader } from '../../../components/AppLoader';
import { useState } from "react";
import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from "expo-image-picker";
import { Attachment } from "./registration-model";
import { palette, s } from "./registration.styles";
import { StoreIcon } from "./StoreIcon";

type Props = {
  label: string;
  hint: string;
  value: Attachment | null;
  error?: string;
  onChange: (value: Attachment | null) => void;
};
export function DocumentUpload({ label, hint, value, error, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [pickerError, setPickerError] = useState("");
  async function choose() {
    if (busy) return;
    setBusy(true);
    setPickerError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled) return;
      const photo = result.assets[0];
      if (!photo?.uri)
        throw new Error("Could not read this photo. Please choose another.");
      if (photo.fileSize && photo.fileSize > 10 * 1024 * 1024) {
        throw new Error("Choose a photo smaller than 10 MB.");
      }
      onChange({
        uri: photo.uri,
        name: photo.fileName || `${label} photo`,
        mimeType: photo.mimeType || "image/jpeg",
      });
    } catch (cause) {
      setPickerError(
        cause instanceof Error
          ? cause.message
          : "Could not open photos. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.upload, !!(error || pickerError) && s.invalid]}>
        {value ? (
          <>
            {!value.saved && <Image
              accessibilityLabel={`${label} preview`}
              source={{ uri: value.uri }}
              resizeMode="contain"
              style={s.preview}
            />}
            <Text numberOfLines={1} style={s.hint}>
              {value.saved ? 'Saved securely. Replace only if a correction is needed.' : value.name}
            </Text>
            <View style={s.uploadActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Replace ${label}`}
                disabled={busy}
                onPress={() => void choose()}
                style={s.textButton}
              >
                {busy ? (
                  <AppLoader color={palette.accent} />
                ) : (
                  <Text style={s.link}>Replace photo</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${label}`}
                disabled={busy}
                onPress={() => {
                  onChange(null);
                  setPickerError("");
                }}
                style={s.textButton}
              >
                <Text style={s.remove}>Remove</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${label}`}
            disabled={busy}
            onPress={() => void choose()}
            style={s.uploadRow}
          >
            <View style={s.uploadIcon}>
              {busy ? (
                <AppLoader color={palette.accent} />
              ) : (
                <StoreIcon name="upload" size={21} />
              )}
            </View>
            <View style={s.uploadCopy}>
              <Text style={s.uploadTitle}>Choose photo</Text>
              <Text style={s.hint}>{hint}</Text>
              <Text style={s.hint}>Image · up to 10 MB</Text>
            </View>
          </Pressable>
        )}
      </View>
      {!!(pickerError || error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {pickerError || error}
        </Text>
      )}
    </View>
  );
}
