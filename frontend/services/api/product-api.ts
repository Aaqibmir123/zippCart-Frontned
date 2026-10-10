import { apiRequest } from './client';

export type ShopProduct = {
  id: string; name: string; category: string; brand: string; storeOpen?: boolean;
  price: number; mrp: number; stock: number; coverImage: string | null; storeName: string; hasVariants?: boolean;
  sizeOptions?: string[]; colorOptions?: string[];
  variantStock?: { color: string; size: string; stock: number }[];
};
export type ShopProductDetail = ShopProduct & {
  description: string; sku: string; sizes: string[];
  images: string[]; colors: { name: string; images: string[] }[];
};
export type ShopProductMedia = Pick<ShopProductDetail, 'images' | 'colors'>;

export const productApi = {
  list: (page: number, category?: string, search?: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(page) });
    if (category && category !== 'All') params.set('category', category);
    if (search?.trim()) params.set('search', search.trim());
    return apiRequest<{ products: ShopProduct[]; total: number; nextPage: number | null }>(
      `/products?${params.toString()}`, { method: 'GET', public: true, signal },
    );
  },
  get: (id: string, signal?: AbortSignal) => apiRequest<{ product: ShopProductDetail }>(
    `/products/${encodeURIComponent(id)}`, { method: 'GET', public: true, signal },
  ),
  getMedia: (id: string, signal?: AbortSignal) => apiRequest<ShopProductMedia>(
    `/products/${encodeURIComponent(id)}/media`, { method: 'GET', public: true, signal },
  ),
  lookup: (ids: string[], signal?: AbortSignal) => apiRequest<{ products: ShopProduct[] }>(
    '/products/lookup', { method: 'POST', body: { ids }, public: true, signal },
  ),
};
