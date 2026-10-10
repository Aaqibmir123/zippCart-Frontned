import { AppLoader } from '../../../components/AppLoader';
import { useQuery } from "@tanstack/react-query";
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from "../../../context/AuthContext";
import { storeApi, storeQueryKey } from "./store-api";
import { StoreRegistrationScreen } from "./StoreRegistrationScreen";
import { StoreIcon } from "./StoreIcon";
import { palette, s } from "./registration.styles";

export function StoreRegistrationEntry({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const query = useQuery({
    queryKey: storeQueryKey(user?.id),
    queryFn: storeApi.get,
    enabled: !!user,
    retry: 1,
  });
  if (user && query.isSuccess && !query.data.store) {
    return <StoreRegistrationScreen onClose={onClose} />;
  }
  const store = query.data?.store;
  if (editing) return <StoreEditor userId={user?.id} onClose={() => setEditing(false)} />;
  return (
    <View style={s.page}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to account"
          onPress={onClose}
          style={s.iconButton}
        >
          <StoreIcon name="back" />
        </Pressable>
        <Text style={s.headerTitle}>Your store</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        {!user ? (
          <View style={s.card}>
            <Text style={s.title}>Sign in to become a seller.</Text>
            <Text style={s.subtitle}>
              Sign in with your mobile number to register
              your store.
            </Text>
          </View>
        ) : query.isPending ? (
          <AppLoader
            accessibilityLabel="Loading your store"
            color={palette.accent}
          />
        ) : query.isError ? (
          <View style={s.card}>
            <Text accessibilityRole="alert" style={s.error}>
              Could not load your registration.
            </Text>
            <Pressable
              disabled={query.isFetching}
              accessibilityRole="button"
              onPress={() => void query.refetch()}
              style={s.secondary}
            >
              <Text style={s.link}>
                {query.isFetching ? "Loading…" : "Try again"}
              </Text>
            </Pressable>
          </View>
        ) : (
          store && (
            <>
              <View style={s.success}>
                <View style={s.successIcon}>
                  <StoreIcon name="check" size={34} color={palette.green} />
                </View>
                <Text style={[s.title, s.centered]}>{store.storeName}</Text>
                <Text style={[s.subtitle, s.centered]}>
                  Registration received
                </Text>
              </View>
              <View style={s.card}>
                <Text style={s.sectionTitle}>
                  {store.status === "approved"
                    ? "Store approved"
                    : store.status === "rejected"
                      ? "Registration rejected"
                      : "Pending review"}
                </Text>
                <Text style={s.subtitle}>
                  {store.status === "approved" && store.isActive
                    ? "You can switch to Seller Mode from your account menu."
                    : store.status === "rejected"
                      ? "Correct the details below and resubmit for review."
                      : "Your store is saved but is not active yet."}
                </Text>
                <Text style={s.hint}>
                  {store.storeCategory} · {store.locality}, {store.pincode}
                </Text>
                <Text style={s.hint}>Reference: {store.id}</Text>
                {!!store.reviewNote && <Text style={s.error}>Review feedback: {store.reviewNote}</Text>}
                {store.changesPending ? <Text style={s.link}>Changes pending review. Your approved details remain active.</Text> :
                  (store.status === 'rejected' || (store.status === 'approved' && store.isActive)) &&
                  <Pressable accessibilityRole="button" style={s.primary} onPress={() => setEditing(true)}>
                    <Text style={s.primaryText}>{store.status === 'rejected' ? 'Correct and resubmit' : 'Edit store details'}</Text>
                  </Pressable>}
              </View>
            </>
          )
        )}
      </ScrollView>
    </View>
  );
}

function StoreEditor({ userId, onClose }: { userId?: string; onClose: () => void }) {
  const details = useQuery({ queryKey: ['store-edit', userId], queryFn: storeApi.details,
    enabled: !!userId, gcTime: 0, retry: false, refetchOnWindowFocus: false });
  if (details.isSuccess) return <StoreRegistrationScreen existing={details.data.store} onClose={onClose} onSaved={onClose} />;
  return <View style={s.page}><View style={s.card}>
    {details.isError ? <><Text accessibilityRole="alert" style={s.error}>{details.error.message}</Text>
      <Pressable accessibilityRole="button" style={s.secondary} disabled={details.isFetching} onPress={() => void details.refetch()}>
        <Text style={s.link}>Try again</Text></Pressable></> : <AppLoader />}
    <Pressable accessibilityRole="button" style={s.secondary} onPress={onClose}><Text style={s.link}>Back to your store</Text></Pressable>
  </View></View>;
}
