const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const target = new Module(filename);
  target.paths = module.paths;
  target.require = (name) => name.endsWith('/AppLoader') ? { AppLoader: 'Spinner' } : name in mocks ? mocks[name] : require(name);
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return target.exports;
}

function setup() {
  const requests = [];
  const options = [];
  const pages = [];
  let localCategory = 'All';
  let retries = 0;
  const route = { params: { title: 'Fashion', category: 'Fashion' } };
  const query = {
    data: { pages: [{ products: [{ id: 'product-1' }] }] },
    hasNextPage: true, isPending: false, isError: false, isFetching: false,
    refetch: () => { retries++; }, fetchNextPage: (input) => pages.push(input),
  };
  const { productApi } = load('services/api/product-api.ts', {
    './client': { apiRequest: (url) => { requests.push(url); return Promise.resolve({ products: [] }); } },
  });
  const productQueries = load('services/products/product-queries.ts', {
    '@tanstack/react-query': { useInfiniteQuery: (input) => { options.push(input); return query; } },
    '../api/product-api': { productApi },
  });
  const catalogHook = load('features/home/useHomeCatalog.ts', {
    react: {
      useState: () => [localCategory, (value) => { localCategory = value; }],
      useMemo: (fn) => fn(), useRef: (value) => ({ current: value }),
      useCallback: (callback) => callback,
    },
    '@tanstack/react-query': {
      useMutation: () => ({ isPending: false }),
      useQueryClient: () => ({ getQueryData() {}, setQueryData() {} }),
    },
    '../../services/products/product-queries': productQueries,
    '../../services/favorites/favorite-queries': {
      useFavorites: () => ({ isSuccess: true, refetch() {} }), useToggleFavorite: () => ({}),
    },
    '../../services/cart/cart-queries': { useAddCartItem: () => ({}) },
    '../../services/api/product-api': { productApi },
    '../../hooks/useTimedFeedback': { useTimedFeedback: () => ({ feedback: null }) },
    '../../services/api/api-error': { isApiError: () => false },
  });
  const { ProductListingScreen } = load('features/catalog/ProductListingScreen.tsx', {
    react: { useCallback: (callback) => callback },
    '@react-navigation/native': { useRoute: () => route, useNavigation: () => ({ navigate() {}, goBack() {} }) },
    'react-native': {
      ActivityIndicator: 'Spinner', FlatList: 'List', Pressable: 'Button', Text: 'Text', View: 'View',
      useWindowDimensions: () => ({ width: 390 }),
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeArea' },
    '../../components/TopFeedbackToast': { TopFeedbackToast: 'Toast' },
    '../home/HomeProductCard': { HomeProductCard: 'Card' },
    '../home/WishlistStatus': { WishlistStatus: 'WishlistStatus' },
    '../home/useHomeCatalog': catalogHook,
    '../home/home.styles': { h: {}, palette: {} },
    '../../theme/ThemeProvider': { useAppTheme: () => ({ isDark: false, colors: { background: '#fff' } }) },
  });
  return { route, query, requests, options, pages, catalogHook,
    render: () => ProductListingScreen().props.children[0], retries: () => retries };
}

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat().flatMap(nodes)];
}

test('selected route category reaches the API on first load, next page and category change', async () => {
  const app = setup();
  const fashion = app.render();
  assert.deepEqual(app.options[0].queryKey, ['shop-products', 'Fashion', '']);
  await app.options[0].queryFn({ pageParam: 1 });
  await app.options[0].queryFn({ pageParam: 2 });
  app.route.params = { title: 'Beauty', category: 'Beauty' };
  const beauty = app.render();
  await app.options[1].queryFn({ pageParam: 1 });
  assert.deepEqual(app.options[1].queryKey, ['shop-products', 'Beauty', '']);
  assert.notEqual(fashion.key, beauty.key);
  assert.deepEqual(app.requests, [
    '/products?page=1&category=Fashion', '/products?page=2&category=Fashion', '/products?page=1&category=Beauty',
  ]);
  assert.equal(app.options[1].getNextPageParam({ nextPage: null }), undefined);
});

test('home chips still control their own category and unfiltered listing defaults to All', async () => {
  const app = setup();
  app.catalogHook.useHomeCatalog(() => {}).setCategory('Watches');
  assert.equal(app.catalogHook.useHomeCatalog(() => {}).category, 'Watches');
  app.route.params = { title: 'All products' };
  app.render();
  assert.deepEqual(app.options.at(-1).queryKey, ['shop-products', 'All', '']);
  await app.options.at(-1).queryFn({ pageParam: 1 });
  assert.deepEqual(app.requests, ['/products?page=1']);
});

test('failed initial fetch shows retry, not an empty category; pending shows a spinner', () => {
  const app = setup();
  app.query.isError = true;
  const empty = nodes(app.render().props.ListEmptyComponent);
  assert.ok(empty.some((node) => node.props.children === 'Could not load products.'));
  empty.find((node) => node.type === 'Button').props.onPress();
  assert.equal(app.retries(), 1);
  app.query.isError = false;
  app.query.isPending = true;
  assert.ok(nodes(app.render().props.ListEmptyComponent).some((node) => node.type === 'Spinner'));
});

test('load more guards in-flight requests and exposes page retry without removing products', () => {
  const app = setup();
  app.query.isFetching = true;
  const busy = app.render().props.ListFooterComponent;
  assert.equal(busy.props.disabled, true);
  busy.props.onPress();
  assert.deepEqual(app.pages, []);
  app.query.isFetching = false;
  app.query.isError = true;
  app.query.isFetchNextPageError = true;
  const list = app.render();
  assert.equal(list.props.data.length, 1);
  assert.ok(nodes(list.props.ListFooterComponent).some((node) => node.props.children === 'Could not load more. Try again'));
  list.props.ListFooterComponent.props.onPress();
  assert.deepEqual(app.pages, [{ cancelRefetch: false }]);
});

test('scroll pagination fetches the next page once and ignores end events while busy', () => {
  const app = setup();
  const list = app.render();
  list.props.onEndReached();
  assert.deepEqual(app.pages, [{ cancelRefetch: false }]);
  app.query.isFetching = true;
  list.props.onEndReached();
  assert.deepEqual(app.pages, [{ cancelRefetch: false }]);
});
