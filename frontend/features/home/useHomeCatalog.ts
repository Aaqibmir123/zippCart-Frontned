import { useCallback, useMemo, useRef, useState } from 'react';
import { ProductCategory } from '../../data/products';
import { useShopProducts } from '../../services/products/product-queries';
import { useFavorites, useToggleFavorite } from '../../services/favorites/favorite-queries';
import { useTimedFeedback } from '../../hooks/useTimedFeedback';
import { isApiError } from '../../services/api/api-error';
import type { ShopProductDetail } from '../../services/api/product-api';
import { useQueryClient } from '@tanstack/react-query';

export function useHomeCatalog(onOpen: (id: string) => void, selectedCategory?: ProductCategory | 'All') {
  const [localCategory, setCategory] = useState<ProductCategory | 'All'>('All');
  const category = selectedCategory ?? localCategory;
  const query = useShopProducts(category);
  const favorites = useFavorites();
  const favoriteMutation = useToggleFavorite();
  const { mutateAsync: mutateFavorite } = favoriteMutation;
  const queryClient = useQueryClient();
  const pendingFavoriteLocks = useRef(new Set<string>());
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<Set<string>>(() => new Set());
  const { feedback, showFeedback } = useTimedFeedback();
  const products = useMemo(() => query.data?.pages.flatMap((page) => page.products) ?? [], [query.data]);
  const favoriteIds = useMemo(() => new Set(favorites.data?.favorites.map((item) => item.productId)), [favorites.data]);
  const addToCart = useCallback((id: string) => {
    const product = products.find((item) => item.id === id);
    if (product && !queryClient.getQueryData<{ product: ShopProductDetail }>(['shop-product', id])) {
      queryClient.setQueryData<{ product: ShopProductDetail }>(['shop-product', id], {
        product: {
          ...product,
          description: '',
          sku: '',
          sizes: product.sizeOptions ?? [],
          images: [],
          colors: (product.colorOptions ?? []).map((name) => ({ name, images: [] })),
        },
      }, { updatedAt: 0 });
    }
    onOpen(id);
  }, [products, queryClient, onOpen]);
  const toggleFavorite = useCallback(async (id: string) => {
    if (pendingFavoriteLocks.current.has(id) || !favorites.isSuccess) return;
    pendingFavoriteLocks.current.add(id);
    setPendingFavoriteIds((current) => new Set(current).add(id));
    const isFavorite = favoriteIds.has(id);
    try {
      await mutateFavorite({ isFavorite, productId: id });
      showFeedback(isFavorite ? 'Removed from wishlist' : 'Saved to wishlist', 'success', isFavorite ? 'favoriteRemoved' : 'favoriteAdded');
    } catch (error) {
      showFeedback(isApiError(error) ? error.message : 'Could not update wishlist. Please try again.', 'error');
    } finally {
      pendingFavoriteLocks.current.delete(id);
      setPendingFavoriteIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }, [favorites.isSuccess, favoriteIds, mutateFavorite, showFeedback]);
  return { category, setCategory, query, products, favorites, favoriteIds, favoriteMutation, pendingFavoriteIds,
    addToCart, toggleFavorite, feedback };
}
