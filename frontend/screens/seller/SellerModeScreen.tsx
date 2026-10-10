import { AppLoader } from '../../components/AppLoader';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api/client";
import { authApi } from "../../services/api/auth-api";
import { StoreSummary } from "../../features/user/store-registration/store-api";
import { SellerWorkspace } from "../../features/seller/SellerWorkspace";
import { useScreenActive } from '../../hooks/useScreenActive';

export function SellerModeScreen() {
  const { user, setUser } = useAuth();
  const active = useScreenActive();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["seller-session", user?.id],
    queryFn: () =>
      apiRequest<{ store: StoreSummary }>("/seller/session", { method: "GET" }),
    retry: false,
    enabled: active && !!user,
    refetchInterval: active ? 30000 : false,
  });
  async function customerMode() {
    if (!user) return;
    // Returning to shopping never requires seller privileges or a network connection.
    setUser({ ...user, mode: "customer" });
    await authApi.switchMode("customer").catch(() => undefined);
  }
  if (query.data && !query.isError)
    return (
      <SellerWorkspace
        storeName={query.data.store.storeName}
        isOpen={query.data.store.isOpen}
        onAvailabilityChange={(store) => client.setQueryData(['seller-session', user?.id], { store })}
        onCustomer={() => void customerMode()}
      />
    );
  return (
    <SafeAreaView style={s.page}>
      <View style={s.card}>
        <Text style={s.eyebrow}>ZIPPCART</Text>
        <Text style={s.title}>Seller Mode</Text>
        {query.isPending ? (
          <AppLoader color="#626289" />
        ) : query.isError ? (
          <>
            <Text accessibilityRole="alert" style={s.copy}>
              Seller access is unavailable. Your store must be approved and
              active.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void query.refetch()}
              style={s.button}
            >
              <Text style={s.buttonText}>Try again</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => void customerMode()}
          style={s.button}
        >
          <Text style={s.buttonText}>Switch to Customer Mode</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F8F8FC",
    padding: 24,
    justifyContent: "center",
  },
  card: { padding: 24, borderRadius: 24, backgroundColor: "white", gap: 20 },
  eyebrow: {
    color: "#9C90AE",
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: "700",
  },
  title: { color: "#354159", fontSize: 26, fontWeight: "800" },
  copy: { color: "#737D90", fontSize: 14, lineHeight: 22 },
  button: {
    backgroundColor: "#EDEAF5",
    padding: 16,
    minHeight: 48,
    borderRadius: 14,
  },
  buttonText: { color: "#50567F", fontWeight: "700", textAlign: "center" },
});
