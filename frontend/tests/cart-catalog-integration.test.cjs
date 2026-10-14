const test = require('node:test');
const assert = require('node:assert/strict');
const { QueryClient, QueryObserver } = require('@tanstack/react-query');
const { sourceLoader } = require('./helpers/load-source.cjs');

test('cart service public products eliminate the real query observer fallback; old responses still work', async t => {
  const testEnv = { NODE_ENV: 'test', JWT_ACCESS_SECRET: 'test-access-secret'.repeat(3),
    JWT_REFRESH_SECRET: 'test-refresh-secret'.repeat(3) };
  for (const [key, value] of Object.entries(testEnv)) {
    const previous = process.env[key]; process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const { createCartService } = await import('../../backend/src/user/services/cart.service.js');
  const productId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const row = { _id: productId, name: 'Shirt', category: 'Fashion', price: 100, mrp: 150, stock: 5,
    storeId: { storeName: 'Store', isOpen: true }, variantStock: [{ color: 'Blue', size: 'M', stock: 2 }] };
  const cart = createCartService({ findByUserId: async () => [{ _id: 'line1', productId, color: 'Blue', size: 'M', quantity: 1 }] },
    { lookup: async () => [row] });
  const modern = await cart.getCart('user-a');
  assert.equal(modern[0].product.id, productId);

  async function measure(items) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const disposals = []; const requests = [];
    const load = sourceLoader({
      react: { useState: value => [value, () => {}] },
      '@tanstack/react-query': { useQueryClient: () => client, useQuery: options => {
        const observer = new QueryObserver(client, options);
        disposals.push(observer.subscribe(() => {}));
        return observer.getCurrentResult();
      } },
      '../api/product-api': { productApi: { lookup: async (ids, signal) => {
        requests.push(ids); assert.ok(signal instanceof AbortSignal);
        return { products: [modern[0].product] };
      } } },
      './useTimedFeedback': { useTimedFeedback: () => ({ feedback: null, showFeedback() {} }) },
      '../services/cart/cart-queries': { useCart: () => ({ data: { items } }), useCartPending: () => false,
        useRemoveCartItem: () => ({}), useUpdateCartQuantity: () => ({}) },
    });
    try {
      const screen = load('hooks/useCartScreen.ts').useCartScreen();
      await new Promise(resolve => setImmediate(resolve));
      return { requests, screen };
    } finally { disposals.forEach(dispose => dispose()); client.clear(); }
  }
  const before = await measure(modern.map(({ product, ...item }) => item));
  const after = await measure(modern);
  assert.deepEqual(before.requests, [[productId]]);
  assert.deepEqual(after.requests, []);
  assert.equal(after.screen.items[0].productKnown, true);
  assert.equal(after.screen.items[0].maxQuantity, 2);
  assert.equal(after.screen.total, 100);
  assert.equal(after.screen.checkoutBlocked, false);
  const closed = await measure(modern.map(item => ({ ...item, product: { ...item.product, storeOpen: false } })));
  assert.equal(closed.screen.checkoutBlocked, true); assert.equal(closed.screen.items[0].maxQuantity, 0);
  const mixed = await measure([...modern, { ...modern[0], id: 'line2', productId: 'unavailable', product: undefined }]);
  assert.deepEqual(mixed.requests, [['unavailable']]);
  assert.equal(mixed.screen.checkoutBlocked, true);
  t.diagnostic(JSON.stringify({ coldCartFallbackRequestsBefore: before.requests.length, after: after.requests.length }));
});
