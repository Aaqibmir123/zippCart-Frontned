import { useState } from 'react';
import { CheckoutAddress } from '../services/api/order-api';
import { useTimedFeedback } from './useTimedFeedback';
import { useShopProductLookup } from '../services/products/product-queries';
import { ShopProduct } from '../services/api/product-api';
import { isApiError } from '../services/api/api-error';
import { useCart, useCartPending, useRemoveCartItem, useUpdateCartQuantity } from '../services/cart/cart-queries';
import { productQuantity, quantityLimit, stockIssue, variantAvailableStock } from '../services/products/stock';

export function useCartScreen() {
  const cartQuery = useCart();
  const cartPending = useCartPending();
  const cartItems = cartQuery.data?.items ?? [];
  const productIds = cartItems.filter((item) => !item.product).map((item) => item.productId);
  const productQuery = useShopProductLookup(productIds);
  const updateQuantityMutation = useUpdateCartQuantity();
  const removeCartItemMutation = useRemoveCartItem();
  const { feedback, showFeedback } = useTimedFeedback();
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressReady, setAddressReady] = useState<CheckoutAddress | null>(null);
  const products = new Map(cartItems.flatMap((item) => item.product ? [[item.product.id, item.product] as const] : []));
  for (const product of productQuery.data?.products ?? []) products.set(product.id, product);
  const productLookupPending = productIds.length > 0 && productQuery.isPending;
  const items = cartItems.map((item) => {
    const product: ShopProduct = products.get(item.productId) ?? {
      id: item.productId, name: 'Unavailable product', category: '', brand: '',
      price: 0, mrp: 0, stock: 0, coverImage: null, storeName: '',
    };
    const matching = product.variantStock?.length ? (cartQuery.data?.items ?? []).filter((entry) => entry.color === item.color && entry.size === item.size) : cartQuery.data?.items ?? [];
    const combinedQuantity = productQuantity(matching, item.productId);
    const stock = variantAvailableStock(product, item.color, item.size);
    return { ...item, product, productKnown: products.has(item.productId),
      maxQuantity: product.storeOpen === false ? 0 : quantityLimit(stock, combinedQuantity - item.quantity),
      stockMessage: product.storeOpen === false ? 'Store is closed. Ordering resumes when it opens.' : products.has(item.productId) ? stockIssue(stock, combinedQuantity)
        : 'This product is unavailable. Remove it to continue.',
    };
  }) ?? [];
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const mrp = items.reduce((sum, item) => sum + Math.max(item.product.mrp, item.product.price) * item.quantity, 0);
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const pending = cartPending || updateQuantityMutation.isPending || removeCartItemMutation.isPending;
  const checkoutBlocked = items.some((item) => !!item.stockMessage);
  async function refresh() {
    if (pending) return;
    await Promise.all([cartQuery.refetch(), ...(productIds.length ? [productQuery.refetch()] : [])]);
  }

  async function changeQuantity(id: string, nextQuantity: number) {
    const item = items.find((entry) => entry.id === id);
    if (!item || pending) return;
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1 || nextQuantity > item.maxQuantity) {
      showFeedback(item.stockMessage ?? `You can add up to ${item.maxQuantity} of this item.`, 'error');
      return;
    }
    try {
      await updateQuantityMutation.mutateAsync({ id, quantity: nextQuantity });
    } catch (error) { showFeedback(isApiError(error) ? error.message : 'Could not update your cart.', 'error'); }
  }
  async function removeItem(id: string) {
    if (pending) return;
    try {
      await removeCartItemMutation.mutateAsync(id);
      showFeedback('Removed from cart', 'success');
    } catch (error) { showFeedback(isApiError(error) ? error.message : 'Could not remove this item.', 'error'); }
  }
  return { cartQuery, productQuery, productLookupPending, items, total, mrp, quantity, pending, checkoutBlocked, refresh, feedback, addressOpen, setAddressOpen, setAddressReady, addressReady, changeQuantity, removeItem };
}
