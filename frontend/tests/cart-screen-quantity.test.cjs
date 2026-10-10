const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = Module.createRequire(path.resolve(__dirname, '../package.json'))('typescript');

function loadCartScreen(mocks) {
  const filename = path.resolve(__dirname, '../hooks/useCartScreen.ts');
  const target = new Module(filename);
  target.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
  return target.exports.useCartScreen;
}

test('decrement remains active during a background product refresh', async () => {
  const product = { id: 'p1', name: 'Shirt', category: 'Fashion', brand: 'Test', price: 20, mrp: 25,
    stock: 5, coverImage: null, storeName: 'Local store' };
  const changes = [];
  const useCartScreen = loadCartScreen({
    react: { useState: (value) => [value, () => {}] },
    '../services/api/order-api': {},
    './useTimedFeedback': { useTimedFeedback: () => ({ feedback: null, showFeedback() {} }) },
    '../services/products/product-queries': {
      useShopProductLookup: () => ({ data: { products: [product] }, isFetching: true, isPending: false, refetch() {} }),
    },
    '../services/api/product-api': {},
    '../services/api/api-error': { isApiError: () => false },
    '../services/cart/cart-queries': {
      useCartPending: () => false,
      useCart: () => ({ data: { items: [{ id: 'line1', productId: 'p1', color: '', size: '', quantity: 3 }] } }),
      useRemoveCartItem: () => ({ isPending: false, mutateAsync: async () => {} }),
      useUpdateCartQuantity: () => ({ isPending: false, mutateAsync: async (input) => changes.push(input) }),
    },
    '../services/products/stock': {
      productQuantity: (items, id) => items.filter((item) => item.productId === id).reduce((sum, item) => sum + item.quantity, 0),
      quantityLimit: (stock, others = 0) => Math.min(99, Math.max(0, stock - others)),
      stockIssue: () => null,
      variantAvailableStock: (item) => item.stock,
    },
  });

  const cart = useCartScreen();
  await cart.changeQuantity('line1', 2);
  assert.deepEqual(changes, [{ id: 'line1', quantity: 2 }]);
});

test('embedded cart product data avoids a second lookup request', () => {
  const product = { id: 'p1', name: 'Shirt', category: 'Fashion', brand: 'Test', price: 20, mrp: 25,
    stock: 5, coverImage: null, storeName: 'Local store' };
  let requestedIds;
  const useCartScreen = loadCartScreen({
    react: { useState: (value) => [value, () => {}] },
    '../services/api/order-api': {},
    './useTimedFeedback': { useTimedFeedback: () => ({ feedback: null, showFeedback() {} }) },
    '../services/products/product-queries': {
      useShopProductLookup: (ids) => { requestedIds = ids; return { data: undefined, isPending: false, refetch() {} }; },
    },
    '../services/api/product-api': {},
    '../services/api/api-error': { isApiError: () => false },
    '../services/cart/cart-queries': {
      useCartPending: () => false,
      useCart: () => ({ data: { items: [{ id: 'line1', productId: 'p1', color: '', size: '', quantity: 2, product }] } }),
      useRemoveCartItem: () => ({ isPending: false, mutateAsync: async () => {} }),
      useUpdateCartQuantity: () => ({ isPending: false, mutateAsync: async () => {} }),
    },
    '../services/products/stock': {
      productQuantity: (items, id) => items.filter((item) => item.productId === id).reduce((sum, item) => sum + item.quantity, 0),
      quantityLimit: (stock, others = 0) => Math.min(99, Math.max(0, stock - others)),
      stockIssue: () => null,
      variantAvailableStock: (item) => item.stock,
    },
  });

  const cart = useCartScreen();

  assert.deepEqual(requestedIds, []);
  assert.equal(cart.productLookupPending, false);
  assert.equal(cart.items[0].product, product);
  assert.equal(cart.items[0].productKnown, true);
});

test('a cart write on another screen blocks local edits, removal and manual refresh', async () => {
  const fail = () => assert.fail('Must wait for the shared cart write to finish');
  const useCartScreen = loadCartScreen({
    react: { useState: (value) => [value, () => {}] },
    './useTimedFeedback': { useTimedFeedback: () => ({ feedback: null, showFeedback() {} }) },
    '../services/products/product-queries': { useShopProductLookup: () => ({ refetch: fail }) },
    '../services/api/api-error': { isApiError: () => false },
    '../services/cart/cart-queries': {
      useCartPending: () => true,
      useCart: () => ({ data: { items: [] }, refetch: fail }),
      useRemoveCartItem: () => ({ isPending: false, mutateAsync: fail }),
      useUpdateCartQuantity: () => ({ isPending: false, mutateAsync: fail }),
    },
    '../services/products/stock': {},
  });
  const cart = useCartScreen();
  assert.equal(cart.pending, true);
  await cart.changeQuantity('line1', 2);
  await cart.removeItem('line1');
  await cart.refresh();
});
