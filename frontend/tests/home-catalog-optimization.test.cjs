const test = require('node:test');
const assert = require('node:assert/strict');
const { QueryClient, QueryObserver, InfiniteQueryObserver } = require('@tanstack/react-query');
const { sourceLoader } = require('./helpers/load-source.cjs');
const tick = () => new Promise(setImmediate);

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}

test('memoized cards explain availability and View keeps details and wishlist accessible', () => {
  const load = sourceLoader({
    'react-native': { Image: 'Image', Pressable: 'Button', Text: 'Text', View: 'View' },
    '../../components/AppLoader': { AppLoader: 'Loader' },
    './HomeIcon': { HomeIcon: 'Icon' }, './home.styles': { h: {} },
    '../../theme/ThemeProvider': { useAppTheme: () => ({ colors: {}, isDark: false }) },
  });
  const { HomeProductCard } = load('features/home/HomeProductCard.tsx');
  assert.equal(HomeProductCard.$$typeof, Symbol.for('react.memo'));
  assert.equal(HomeProductCard.compare, null); // Compare all props, including callback changes.
  const called = [];
  for (const [stock, storeOpen, status] of [[5, true, null], [0, true, 'Out of stock'],
    [5, false, 'Store closed'], [0, false, 'Out of stock · Store closed']]) {
    const tree = HomeProductCard.type({
      product: { id: 'one', name: 'Shirt', price: 100, mrp: 150, stock, storeOpen },
      width: 164, favorite: false, favoritePending: false,
      onOpen: id => called.push(['open', id]), onAdd: id => called.push(['details', id]),
      onFavorite: id => called.push(['favorite', id]),
    });
    const rendered = nodes(tree);
    const text = rendered.filter(n => n.type === 'Text').map(n => n.props.children);
    assert.ok(text.includes('View')); assert.ok(!text.includes('Add'));
    if (status) assert.ok(text.includes(status));
    else assert.ok(!text.some(value => typeof value === 'string' && /Out of stock|Store closed/.test(value)));
    const view = rendered.find(n => n.props.accessibilityLabel === 'View details for Shirt');
    assert.ok(!view.props.disabled); view.props.onPress();
    rendered.find(n => n.props.accessibilityLabel === 'View Shirt').props.onPress();
    rendered.find(n => n.props.accessibilityLabel === 'Save Shirt to wishlist').props.onPress();
  }
  assert.deepEqual(called.slice(0, 3), [['details', 'one'], ['open', 'one'], ['favorite', 'one']]);
});

function hooks() {
  const slots = []; let cursor = 0;
  const memo = (factory, deps) => {
    const i = cursor++; const previous = slots[i];
    if (!previous || deps.some((value, j) => !Object.is(value, previous.deps[j]))) slots[i] = { value: factory(), deps };
    return slots[i].value;
  };
  return { begin: () => { cursor = 0; }, react: {
    useMemo: memo, useCallback: (callback, deps) => memo(() => callback, deps),
    useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState: initial => {
      const i = cursor++;
      slots[i] ??= { value: typeof initial === 'function' ? initial() : initial,
        set: next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; } };
      return [slots[i].value, slots[i].set];
    },
  } };
}

test('Home callbacks and category setter stay stable across unrelated rerenders without stale wishlist state', async () => {
  const state = hooks(); const calls = [];
  const data = { pages: [{ products: [{ id: 'one', sizeOptions: ['M'], colorOptions: ['Blue'] }] }] };
  let favoriteData = { favorites: [] };
  const mutateAsync = async input => calls.push(input);
  const client = { getQueryData: () => undefined, setQueryData() {} };
  const showFeedback = () => {};
  const load = sourceLoader({ react: state.react,
    '@tanstack/react-query': { useQueryClient: () => client },
    '../../services/products/product-queries': { useShopProducts: () => ({ data }) },
    '../../services/favorites/favorite-queries': {
      useFavorites: () => ({ data: favoriteData, isSuccess: true }),
      useToggleFavorite: () => ({ mutateAsync }),
    },
    '../../hooks/useTimedFeedback': { useTimedFeedback: () => ({ showFeedback, feedback: null }) },
  });
  const { useHomeCatalog } = load('features/home/useHomeCatalog.ts');
  const open = () => {};
  const render = () => { state.begin(); return useHomeCatalog(open); };
  const first = render(); const next = render();
  assert.equal(first.setCategory, next.setCategory);
  assert.equal(first.addToCart, next.addToCart);
  assert.equal(first.toggleFavorite, next.toggleFavorite);
  await next.toggleFavorite('one');
  favoriteData = { favorites: [{ productId: 'one' }] };
  await render().toggleFavorite('one');
  assert.deepEqual(calls, [{ isFavorite: false, productId: 'one' }, { isFavorite: true, productId: 'one' }]);
});

test('Home cold cache makes three data reads; concurrent and fresh observers reuse them per session', async t => {
  const sessions = sourceLoader()('services/auth/session-scope.ts');
  let session = sessions.setSessionUser('A');
  const calls = { catalog: 0, favorites: 0, cart: 0 };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  t.after(() => client.clear());
  const load = sourceLoader({
    '@tanstack/react-query': { useQuery: options => options, useInfiniteQuery: options => options, useIsMutating: () => 0 },
    '../../context/AuthContext': { useAuth: () => ({ session }) }, '../auth/session-scope': sessions,
    '../api/product-api': { productApi: { list: async () => { calls.catalog++; await tick(); return { products: [], nextPage: null, total: 0 }; } } },
    '../api/cart-api': { cartApi: { getCart: async () => { calls.cart++; await tick(); return { items: [] }; } } },
    '../api/favorites-api': { favoritesApi: { list: async () => { calls.favorites++; await tick(); return { favorites: [] }; } } },
  });
  const { useShopProducts } = load('services/products/product-queries.ts');
  const { useFavorites } = load('services/favorites/favorite-queries.ts');
  const { useCart } = load('services/cart/cart-queries.ts');
  const mount = () => {
    const observers = [[InfiniteQueryObserver, useShopProducts()], [QueryObserver, useFavorites()], [QueryObserver, useCart()]]
      .map(([Observer, options]) => new Observer(client, options));
    const unsubscribe = observers.map(observer => observer.subscribe(() => {}));
    t.after(() => unsubscribe.forEach(fn => fn()));
  };
  mount(); mount(); await tick(); await tick();
  assert.deepEqual(calls, { catalog: 1, favorites: 1, cart: 1 });
  mount(); await tick();
  assert.deepEqual(calls, { catalog: 1, favorites: 1, cart: 1 });
  // AuthProvider clears the client on identity change; private keys also isolate sessions.
  client.clear(); session = sessions.setSessionUser('B');
  mount(); await tick(); await tick();
  assert.deepEqual(calls, { catalog: 2, favorites: 2, cart: 2 });
});
