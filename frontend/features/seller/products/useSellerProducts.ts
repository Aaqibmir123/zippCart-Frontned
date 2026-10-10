import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productApi, SellerProductInput } from "./product-api";

const productKey = (ownerId?: string) => ["seller-products", ownerId];

export function useSellerProducts(ownerId?: string) {
  return useInfiniteQuery({
    queryKey: productKey(ownerId),
    enabled: !!ownerId,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => productApi.list(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });
}

export function useSellerProduct(ownerId?: string, id?: string) {
  return useQuery({
    queryKey: ["seller-product", ownerId, id],
    enabled: !!ownerId && !!id,
    queryFn: () => productApi.get(id!),
  });
}

export function useSaveSellerProduct(ownerId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: SellerProductInput }) =>
      id ? productApi.update(id, input) : productApi.create(input),
    onError: async (_error, { id }) => {
      if (id) await client.invalidateQueries({ queryKey: ["seller-product", ownerId, id] }).catch(() => undefined);
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: productKey(ownerId) }),
        client.invalidateQueries({ queryKey: ["seller-product", ownerId] }),
      ]);
    },
  });
}

export function useSetSellerProductStatus(ownerId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => productApi.setStatus(id, active),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: productKey(ownerId) }),
        client.invalidateQueries({ queryKey: ["seller-product", ownerId] }),
      ]);
    },
  });
}
