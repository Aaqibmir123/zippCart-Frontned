import { AppLoader } from '../../../components/AppLoader';
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../../context/AuthContext";
import { StoreIcon } from "../../user/store-registration/StoreIcon";
import { adminStoreApi, RequestFilter } from "./admin-api";
import { RequestCard } from "./RequestCard";
import { RequestDetailScreen } from "./RequestDetailScreen";
import { s } from "./admin.styles";

const filters: RequestFilter[] = ["pending", "approved", "rejected", "all"];
export function AdminStoresScreen({
  onClose,
  embedded = false,
  initialFilter = "pending",
  onOpenRequest,
}: {
  onClose: () => void;
  embedded?: boolean;
  initialFilter?: RequestFilter;
  onOpenRequest?: (id: string) => void;
}) {
  const { user } = useAuth();
  const allowed = !!user?.roles?.includes("admin");
  const [filter, setFilter] = useState<RequestFilter>(initialFilter);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["admin-stores", user?.id, filter],
    queryFn: ({ pageParam }) => adminStoreApi.list(filter, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: allowed,
    retry: false,
  });
  const counts = useQuery({
    queryKey: ["admin-store-counts", user?.id],
    queryFn: adminStoreApi.counts,
    enabled: allowed,
    retry: false,
  });
  if (!allowed)
    return (
      <View style={s.empty}>
        <Text style={s.title}>Admin access required</Text>
        <Pressable onPress={onClose} style={s.button}>
          <Text style={s.link}>Back to account</Text>
        </Pressable>
      </View>
    );
  if (selected)
    return (
      <RequestDetailScreen
        id={selected}
        onClose={() => setSelected(null)}
        onReviewed={(message) => {
          setSelected(null);
          setFeedback(message);
        }}
      />
    );
  return (
    <View style={s.page}>
      {!embedded && (
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to account"
            onPress={onClose}
            style={s.back}
          >
            <StoreIcon name="back" />
          </Pressable>
          <View style={s.flex}>
            <Text style={s.eyebrow}>ZIPPCART ADMIN</Text>
            <Text style={s.headerTitle}>Store requests</Text>
          </View>
          <View style={s.mark}>
            <StoreIcon name="store" />
          </View>
        </View>
      )}
      <FlatList
        data={query.data?.pages.flatMap((page) => page.stores) ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.content}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => {
          void query.refetch();
          void counts.refetch();
        }}
        ListHeaderComponent={
          <>
            {!!feedback && (
              <Text accessibilityRole="alert" style={s.success}>
                {feedback}
              </Text>
            )}
            {!embedded && (
              <LinearGradient colors={["#3C3554", "#252C40"]} style={s.hero}>
                <Text style={s.heroKicker}>THE SELLER COMMUNITY</Text>
                <Text style={s.heroTitle}>
                  Good stores.{"\n"}Great beginnings.
                </Text>
                <Text style={s.heroCopy}>
                  Review the people and places joining JhelumKart.
                </Text>
                <View style={s.stats}>
                  {filters.slice(0, 3).map((status) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${status} requests`}
                      key={status}
                      onPress={() => setFilter(status)}
                      style={s.stat}
                    >
                      <Text style={s.statNumber}>
                        {counts.data?.counts[status] ?? "—"}
                      </Text>
                      <Text style={s.statLabel}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </LinearGradient>
            )}
            {!embedded && counts.isError && (
              <Pressable
                accessibilityRole="button"
                onPress={() => void counts.refetch()}
                style={s.button}
              >
                <Text style={s.error}>Counts unavailable · Tap to retry</Text>
              </Pressable>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filters}
            >
              {filters.map((status) => (
                <Pressable
                  key={status}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === status }}
                  onPress={() => {
                    setFilter(status);
                    setFeedback("");
                  }}
                  style={[s.filter, status === filter && s.filterActive]}
                >
                  <Text style={s.filterText}>
                    {status === "all"
                      ? "All requests"
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {query.isError && !query.isFetchNextPageError && (
              <View style={s.card}>
                <Text style={s.error}>{query.error.message}</Text>
                <Pressable
                  onPress={() => void query.refetch()}
                  style={s.button}
                >
                  <Text style={s.link}>Try again</Text>
                </Pressable>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          query.isPending ? (
            <AppLoader />
          ) : !query.isError ? (
            <View style={s.empty}>
              <View style={s.mark}>
                <StoreIcon name="check" />
              </View>
              <Text style={s.title}>You're all caught up</Text>
              <Text style={s.copy}>
                No {filter === "all" ? "" : `${filter} `}requests to show.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <RequestCard
            store={item}
            onOpen={() =>
              onOpenRequest ? onOpenRequest(item.id) : setSelected(item.id)
            }
          />
        )}
        ListFooterComponent={
          query.hasNextPage ? (
            <Pressable
              accessibilityRole="button"
              disabled={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
              style={s.button}
            >
              {query.isFetchingNextPage ? (
                <AppLoader />
              ) : (
                <Text style={s.link}>
                  {query.isFetchNextPageError
                    ? "Could not load more · Retry"
                    : "Load more requests"}
                </Text>
              )}
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}
