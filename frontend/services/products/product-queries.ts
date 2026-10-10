import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { productApi, ShopProduct, ShopProductDetail } from '../api/product-api';

export function useShopProducts(category = 'All', search = '', enabled = true) {
  return useInfiniteQuery({
    queryKey: ['shop-products', category, search], enabled, initialPageParam: 1,
    staleTime: 30000,
    queryFn: ({ pageParam, signal }) => productApi.list(pageParam, category, search, signal),
    getNextPageParam: (last) => last.nextPage ?? undefined,
  });
}
export function useShopProduct(id: string) {
  return useQuery({ queryKey: ['shop-product', id], queryFn: ({ signal }) => productApi.get(id, signal), staleTime: 15000 });
}
export function useShopProductMedia(id: string, enabled = true) {
  return useQuery({ queryKey: ['shop-product-media', id], queryFn: ({ signal }) => productApi.getMedia(id, signal),
    enabled, staleTime: 300000 });
}
export function useShopProductLookup(ids: string[]) {
  const queryClient = useQueryClient();
  const unique = [...new Set(ids)].sort();
  const cachedProducts = new Map<string, ShopProduct>();
  for (const [, data] of queryClient.getQueriesData<InfiniteData<{ products: ShopProduct[] }>>({ queryKey: ['shop-products'] })) {
    for (const product of data?.pages.flatMap((page) => page.products) ?? []) cachedProducts.set(product.id, product);
  }
  for (const id of unique) {
    const detail = queryClient.getQueryData<{ product: ShopProductDetail }>(['shop-product', id])?.product;
    if (detail) cachedProducts.set(id, detail);
  }
  const cachedLookup = unique.map((id) => cachedProducts.get(id));
  const placeholderData = cachedLookup.every((product): product is ShopProduct => !!product)
    ? { products: cachedLookup }
    : undefined;
  return useQuery({
    queryKey: ['shop-product-lookup', unique], enabled: unique.length > 0,
    queryFn: ({ signal }) => productApi.lookup(unique, signal), staleTime: 15000,
    placeholderData: unique.length > 0 ? placeholderData : undefined,
  });
}
