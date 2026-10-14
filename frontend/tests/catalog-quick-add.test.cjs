const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadHomeCatalog(mocks) {
  const filename = path.resolve(__dirname, '..', 'features/home/useHomeCatalog.ts');
  const target = new Module(filename);
  target.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
  return target.exports.useHomeCatalog;
}

function mount(product) {
  const requests = { details: 0, cartAdds: [], opened: [], quickAddMutations: 0, detailCache: new Map() };
  const fakeMutation = (options) => ({
    isPending: false,
    mutateAsync: async (...args) => {
      requests.quickAddMutations++;
      const result = await options.mutationFn(...args);
      options.onSuccess?.(result);
      return result;
    },
  });
  const useHomeCatalog = loadHomeCatalog({
    react: {
      useCallback: (callback) => callback,
      useMemo: (factory) => factory(),
      useRef: (current) => ({ current }),
      useState: (value) => [value, () => {}],
    },
    '@tanstack/react-query': {
      useMutation: fakeMutation,
      useQueryClient: () => ({
        getQueryData: (key) => requests.detailCache.get(key[1]),
        setQueryData: (key, value, options) => requests.detailCache.set(key[1], { ...value, updatedAt: options?.updatedAt }),
      }),
    },
    '../../data/products': {},
    '../../services/products/product-queries': {
      useShopProducts: () => ({ data: { pages: [{ products: [product] }] } }),
    },
    '../../services/favorites/favorite-queries': {
      useFavorites: () => ({ data: { favorites: [] }, isSuccess: true }),
      useToggleFavorite: () => ({ mutateAsync: async () => {} }),
    },
    '../../services/cart/cart-queries': {
      useAddCartItem: () => ({ mutateAsync: async (item) => requests.cartAdds.push(item) }),
    },
    '../../services/api/product-api': {
      productApi: { get: async () => { requests.details++; return { product }; } },
    },
    '../../hooks/useTimedFeedback': {
      useTimedFeedback: () => ({ feedback: null, showFeedback: () => {} }),
    },
    '../../services/api/api-error': { isApiError: () => false },
  });
  const catalog = useHomeCatalog((id) => requests.opened.push({
    id,
    product: requests.detailCache.get(id)?.product,
  }));
  return { catalog, requests };
}

test('card Add action seeds cached product and navigates without an API request', () => {
  const { catalog, requests } = mount({
    id: 'variant', name: 'Shirt', category: 'Fashion', brand: 'Test', price: 5, mrp: 7, stock: 5,
    storeName: 'Store', storeOpen: true, coverImage: null, hasVariants: true,
    sizeOptions: ['M', 'L'], colorOptions: ['Blue'], variantStock: [{ color: 'Blue', size: 'M', stock: 5 }],
  });
  catalog.addToCart('variant');
  assert.equal(requests.opened[0].id, 'variant');
  assert.deepEqual(requests.opened[0].product.sizes, ['M', 'L']);
  assert.deepEqual(requests.opened[0].product.colors.map((color) => color.name), ['Blue']);
  assert.equal(requests.detailCache.get('variant').updatedAt, 0);
  assert.equal(requests.details, 0);
  assert.deepEqual(requests.cartAdds, []);
  assert.equal(requests.quickAddMutations, 0);
});

test('simple product card Add action also navigates without adding to cart', () => {
  const { catalog, requests } = mount({
    id: 'simple', stock: 5, hasVariants: false, variantStock: [],
  });
  catalog.addToCart('simple');
  assert.equal(requests.details, 0);
  assert.equal(requests.opened[0].id, 'simple');
  assert.equal(requests.quickAddMutations, 0);
  assert.deepEqual(requests.cartAdds, []);
});
