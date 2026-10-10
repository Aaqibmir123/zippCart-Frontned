type QuantityItem = { productId: string; quantity: number };
export function variantAvailableStock(product: { stock: number; variantStock?: { color: string; size: string; stock: number }[] }, color: string, size: string) {
  return product.variantStock?.length ? Math.min(availableStock(product.stock), availableStock(product.variantStock.find((item) => item.color === color && item.size === size)?.stock ?? 0)) : availableStock(product.stock);
}

export function availableStock(stock: number): number {
  return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
}

export function productQuantity(items: readonly QuantityItem[], productId: string): number {
  return items.reduce((total, item) => total + (item.productId === productId ? item.quantity : 0), 0);
}

export function quantityLimit(stock: number, otherQuantity = 0): number {
  return Math.min(99, Math.max(0, availableStock(stock) - otherQuantity));
}

export function stockIssue(stock: number, quantity: number): string | null {
  const available = availableStock(stock);
  if (!available) return 'Out of stock. Remove this item to continue.';
  if (quantity > available) return `Only ${available} available across all sizes and colors. Reduce the quantity to continue.`;
  return null;
}
