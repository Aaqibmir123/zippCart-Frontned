import { AppLoader } from '../AppLoader';
import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api/auth-api";
import { isCurrentSession } from '../../services/auth/session-scope';

export function AccountModeSwitch() {
  const { user, session, setUser } = useAuth();
  const query = useQuery({
    queryKey: ["account-access", user?.id, session?.generation],
    queryFn: authApi.me,
    enabled: !!user,
    staleTime: 0,
  });
  useEffect(() => {
    if (
      query.isFetchedAfterMount &&
      query.data &&
      isCurrentSession(session) &&
      query.data.user.id === user?.id
    )
      setUser({ ...query.data.user, mode: user?.mode });
  }, [query.data, query.isFetchedAfterMount, setUser, user?.id, session]);
  const mutation = useMutation({
    mutationFn: () => authApi.switchMode("seller"),
    onSuccess: (result) => { if (isCurrentSession(session)) setUser(result.user); },
  });
  if (
    user?.storeStatus !== "approved" ||
    !user.isActive ||
    !user.roles?.includes("seller")
  )
    return null;
  return (
    <View style={s.panel}>
      <Text style={s.label}>Customer Mode</Text>
      <Pressable
        accessibilityRole="button"
        disabled={mutation.isPending}
        onPress={() => mutation.mutate()}
        style={s.button}
      >
        {mutation.isPending ? (
          <AppLoader color="#626289" />
        ) : (
          <Text style={s.text}>Switch to Seller Mode</Text>
        )}
      </Pressable>
      {mutation.isError && (
        <Text accessibilityRole="alert" style={s.error}>
          {mutation.error.message}
        </Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  panel: { marginHorizontal: 20, marginTop: 16, gap: 10 },
  label: { color: "#737D90", fontSize: 12 },
  button: {
    minHeight: 48,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#EDEAF5",
    alignItems: "center",
  },
  text: { color: "#50567F", fontWeight: "700" },
  error: { color: "#B25365", fontSize: 12 },
});
