import { Pressable, Text, View } from "react-native";
import { StoreSummary } from "../../user/store-registration/store-api";
import { StoreIcon } from "../../user/store-registration/StoreIcon";
import { s } from "./admin.styles";

export function StatusBadge({ status }: { status: StoreSummary["status"] }) {
  return (
    <View
      style={[
        s.badge,
        status === "approved" && s.approved,
        status === "rejected" && s.rejected,
      ]}
    >
      <Text
        style={[
          s.badgeText,
          status === "approved" && s.approvedText,
          status === "rejected" && s.rejectedText,
        ]}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}
export function RequestCard({
  store,
  onOpen,
}: {
  store: StoreSummary;
  onOpen: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Review ${store.storeName}`}
      onPress={onOpen}
      style={({ pressed }) => [s.card, pressed && s.pressed]}
    >
      <View style={s.row}>
        <View style={s.mark}>
          <StoreIcon name="store" />
        </View>
        <View style={s.flex}>
          <Text numberOfLines={2} style={s.title}>
            {store.storeName}
          </Text>
          <Text style={s.copy}>{store.storeCategory}</Text>
        </View>
        <StoreIcon name="arrow" size={18} />
      </View>
      <Text style={s.copy}>
        {store.locality} · {store.pincode}
      </Text>
      <View style={s.divider} />
      <View style={s.between}>
        <Text style={s.copy}>
          {new Date(store.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
        <StatusBadge status={store.changesPending ? 'pending' : store.status} />
      </View>
      {store.changesPending && <Text style={s.copy}>Store details update</Text>}
    </Pressable>
  );
}
