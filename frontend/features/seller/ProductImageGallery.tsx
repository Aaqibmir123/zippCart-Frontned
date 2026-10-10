import { Image, Pressable, Text, View } from "react-native";
import { StoreIcon } from "../user/store-registration/StoreIcon";
import { formStyles as s } from "./seller-product-form.styles";

export function ProductImageGallery({ title, images, canAdd, disabled, onAdd, onRemove }: {
  title: string;
  images: string[];
  canAdd: boolean;
  disabled: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return <View style={s.field}>
    <Text style={s.label}>{title}</Text>
    <View style={s.gallery}>
      {images.map((uri, index) => <View key={`${index}-${uri.slice(-12)}`} style={s.thumbnailWrap}>
        <Image source={{ uri }} style={s.thumbnail} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${title} photo ${index + 1}`}
          disabled={disabled} onPress={() => onRemove(index)} style={s.removePhoto}>
          <Text style={s.removePhotoText}>×</Text>
        </Pressable>
      </View>)}
      {canAdd && <Pressable accessibilityRole="button" accessibilityLabel={`Add ${title} photos`}
        disabled={disabled} onPress={onAdd} style={s.addPhoto}>
        <StoreIcon name="upload" color="#4C805F" size={20} />
        <Text style={s.addPhotoText}>Add photos</Text>
      </Pressable>}
    </View>
  </View>;
}
