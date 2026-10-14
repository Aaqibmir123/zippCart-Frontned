const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const frontendRequire = Module.createRequire(path.resolve(__dirname, '../package.json'));
const ts = frontendRequire('typescript');
const { sourceLoader } = require('./helpers/load-source.cjs');

function load(relative, mocks) {
  const filename = path.resolve(__dirname, '..', relative);
  const target = new Module(filename);
  target.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : frontendRequire(name);
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return target.exports;
}

test('wishlist toggles optimistically update cached favorites, roll back on failure, and refresh without blocking', async () => {
  const sessions = sourceLoader()('services/auth/session-scope.ts');
  const session = sessions.setSessionUser('customer');
  let cache = { favorites: [{ productId: 'old' }] };
  let invalidateCalls = 0;
  let fail = false;
  const options = [];
  const apiCalls = [];
  const client = {
    cancelQueries: async () => {},
    getQueryData: () => cache,
    setQueryData: (_key, updater) => {
      cache = typeof updater === 'function' ? updater(cache) : updater;
    },
    invalidateQueries: () => { invalidateCalls++; return new Promise(() => {}); },
  };
  const useToggleFavorite = load('services/favorites/favorite-queries.ts', {
    '../../context/AuthContext': { useAuth: () => ({ session }) },
    '../auth/session-scope': sessions,
    '@tanstack/react-query': {
      useQuery: () => {},
      useMutation: (input) => { options.push(input); return input; },
      useQueryClient: () => client,
    },
    '../api/favorites-api': { favoritesApi: {
      add: async (id) => { apiCalls.push(['add', id]); if (fail) throw new Error('offline'); },
      remove: async (id) => { apiCalls.push(['remove', id]); },
      list: async () => ({ favorites: [] }),
    } },
  }).useToggleFavorite;
  const mutation = useToggleFavorite();
  const context = await mutation.onMutate({ isFavorite: false, productId: 'new' });
  assert.deepEqual(cache.favorites, [{ productId: 'old' }, { productId: 'new' }]);
  fail = true;
  await assert.rejects(mutation.mutationFn({ isFavorite: false, productId: 'failed' }), /offline/);
  const rollbackContext = await mutation.onMutate({ isFavorite: false, productId: 'failed' });
  await mutation.onError(new Error('offline'), { isFavorite: false, productId: 'failed' }, rollbackContext);
  assert.deepEqual(cache.favorites, [{ productId: 'old' }, { productId: 'new' }]);
  await mutation.onSettled();
  assert.equal(invalidateCalls, 1);
  assert.deepEqual(apiCalls, [['add', 'failed']]);
  assert.deepEqual(context, { previousIndex: -1 });
});

test('card heart exposes per-card busy feedback while wishlist request is pending', () => {
  const { HomeProductCard } = load('features/home/HomeProductCard.tsx', {
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'Fragment',
    },
    'react-native': { Image: 'Image', Pressable: 'Pressable', Text: 'Text', View: 'View' },
    '../../components/AppLoader': { AppLoader: 'AppLoader' },
    '../../services/api/product-api': {},
    '../../utils/money': { money: String },
    './HomeIcon': { HomeIcon: 'HomeIcon' },
    './home.styles': { h: { favorite: 'favorite' }, palette: { pink: 'pink', ink: 'ink' } },
    '../../theme/ThemeProvider': { useAppTheme: () => ({ isDark: false, colors: { text: '#000', muted: '#777', surface: '#fff', border: '#eee', raised: '#f5f5f5', primary: '#7139F5' } }) },
  });
  const product = { id: 'p', name: 'Product', category: 'Fashion', brand: '', storeName: '', price: 1, mrp: 1, stock: 2, coverImage: null };
  const tree = HomeProductCard.type({
    product, width: 180, favorite: false, favoritePending: true,
    onOpen() {}, onFavorite() {}, onAdd() {},
  });
  const button = tree.props.children.find((node) => node?.props?.accessibilityLabel === 'Save Product to wishlist');
  assert.equal(button.props.disabled, true);
  assert.equal(button.props.accessibilityState.busy, true);
  assert.equal(button.props.children.type, 'AppLoader');
  assert.equal(button.props.children.props.accessibilityLabel, 'Updating wishlist');
});

test('wishlist keeps favorites visible while product details refresh in the background', () => {
  const { FavoritesScreen } = load('screens/user/FavoritesScreen.tsx', {
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'Fragment',
    },
    'react': { useState: (initial) => [initial, () => {}] },
    '@react-navigation/native': { useNavigation: () => ({ navigate() {} }) },
    'react-native': {
      FlatList: 'FlatList', Pressable: 'Pressable', StyleSheet: { create: (styles) => styles },
      Text: 'Text', View: 'View',
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../../components/AppLoader': { AppLoader: 'AppLoader' },
    '../../components/shop/FavoriteProductRow': { FavoriteProductRow: 'FavoriteProductRow' },
    '../../features/favorites/EmptyWishlist': { EmptyWishlist: 'EmptyWishlist' },
    '../../components/TopFeedbackToast': { TopFeedbackToast: 'TopFeedbackToast' },
    '../../hooks/useTimedFeedback': { useTimedFeedback: () => ({ feedback: null, showFeedback() {} }) },
    '../../services/products/product-queries': {
      useShopProductLookup: () => ({ data: undefined, isPending: true, isFetching: true, isError: false }),
    },
    '../../services/api/api-error': { isApiError: () => false },
    '../../services/favorites/favorite-queries': {
      useFavorites: () => ({
        data: { favorites: [{ productId: 'p1' }] }, isLoading: false, isError: false, isFetching: true,
      }),
      useToggleFavorite: () => ({ mutateAsync: async () => {}, isPending: false }),
    },
    '../../services/cart/cart-queries': {
      useAddCartItem: () => ({ mutateAsync: async () => {} }),
      useCart: () => ({ data: { items: [] }, isPending: false, isFetching: false, isError: false }),
    },
    '../../theme/ThemeProvider': {
      useAppTheme: () => ({ colors: {
        background: '#fff', surface: '#fff', border: '#ddd', text: '#111', muted: '#777', primary: '#13872e',
      } }),
    },
  });
  const tree = FavoritesScreen();
  const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes)
    : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
  const rendered = nodes(tree);
  const list = rendered.find((node) => node.type === 'FlatList');
  const row = list.props.renderItem({ item: { id: 'p1', product: null } });
  const text = rendered.filter((node) => node.type === 'Text').map((node) => node.props.children);

  assert.ok(list);
  assert.equal(row.props.productLoading, true);
  assert.ok(text.includes('Updating wishlist…'));
  assert.ok(!rendered.some((node) => node.type === 'AppLoader'));
});
