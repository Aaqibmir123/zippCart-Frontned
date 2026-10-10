import { apiRequest } from "../../../services/api/client";

export type SellerProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  brand: string;
  sku: string;
  sizes: string[];
  images: string[];
  colors: ProductColor[];
  price: number;
  mrp: number;
  stock: number;
  exchangeReserved?: number;
  inventoryRevision?: number;
  variantStock?: { color: string; size: string; stock: number }[];
  active: boolean;
};

export type ProductColor = { name: string; images: string[] };

export type SellerProductSummary = Pick<SellerProduct,
  "id" | "name" | "category" | "brand" | "sku" | "price" | "mrp" | "stock" | "active" | "exchangeReserved"
> & { coverImage: string | null };

export type SellerProductInput = Omit<SellerProduct, "id" | "sku" | "exchangeReserved" | "inventoryRevision"> & {
  sku: string;
  expectedInventoryRevision?: number;
};

export const productApi = {
  list: (page: number) => apiRequest<{ products: SellerProductSummary[]; total: number; nextPage: number | null }>(
    `/seller/products?page=${page}`, { method: "GET" },
  ),
  get: (id: string) => apiRequest<{ product: SellerProduct }>(
    `/seller/products/${encodeURIComponent(id)}`, { method: "GET" },
  ),
  create: (input: SellerProductInput) => apiRequest<{ product: SellerProduct }>(
    "/seller/products", { method: "POST", body: input, timeoutMs: 60000 },
  ),
  update: (id: string, input: SellerProductInput) => apiRequest<{ product: SellerProduct }>(
    `/seller/products/${encodeURIComponent(id)}`, { method: "PUT", body: input, timeoutMs: 60000 },
  ),
  setStatus: (id: string, active: boolean) => apiRequest<{ product: SellerProductSummary }>(
    `/seller/products/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { active } },
  ),
};
