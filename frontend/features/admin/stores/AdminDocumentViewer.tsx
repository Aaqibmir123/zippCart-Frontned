import { AppLoader } from '../../../components/AppLoader';
import { useQuery } from "@tanstack/react-query";
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { adminStoreApi, DocumentName } from "./admin-api";
import { s } from "./admin.styles";
import { useAuth } from "../../../context/AuthContext";

export function AdminDocumentViewer({
  id,
  name,
  title,
  onClose,
}: {
  id: string;
  name: DocumentName;
  title: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["admin-document", user?.id, id, name],
    queryFn: () => adminStoreApi.document(id, name),
    gcTime: 0,
    retry: false,
  });
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.imagePage}>
        <View style={s.header}>
          <Text style={[s.whiteText, s.flex]}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={s.button}
          >
            <Text style={s.link}>Close</Text>
          </Pressable>
        </View>
        {query.isPending ? (
          <AppLoader color="white" />
        ) : query.isError ? (
          <View style={s.empty}>
            <Text style={s.error}>Could not load this document.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void query.refetch()}
              style={s.button}
            >
              <Text style={s.link}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <Image
            accessibilityLabel={title}
            source={{ uri: query.data.dataUrl }}
            style={s.image}
            resizeMode="contain"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
