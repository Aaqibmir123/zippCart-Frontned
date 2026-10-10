const test = require('node:test');
const assert = require('node:assert/strict');
const { QueryClient } = require('@tanstack/react-query');
const { sourceLoader } = require('./helpers/load-source.cjs');

const item = { id: 'line', productId: 'product', color: '', size: '', quantity: 1 };
const tick = () => new Promise(setImmediate);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup(t, overrides = {}) {
  const client = new QueryClient({ defaultOptions: {
    queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity },
  } });
  let session;
  const calls = [];
  const load = sourceLoader({
    '@react-navigation/native': { useIsFocused: () => true },
    '../../hooks/useScreenActive': { useScreenActive: () => true },
    '../../context/AuthContext': { useAuth: () => ({ session, user: session?.userId ? { id: session.userId } : null }) },
    '@tanstack/react-query': {
      useQueryClient: () => client, useQuery: (options) => options,
      useMutation: (options) => options, useIsMutating: (filters) => client.isMutating(filters),
    },
    '../api/cart-api': { cartApi: {
      getCart: async () => ({ items: [item] }),
      addItem: async () => { calls.push('add'); return { item }; },
      updateQuantity: async () => { calls.push('quantity'); return { item }; },
      removeItem: async () => { calls.push('remove'); return {}; },
      ...overrides.cart,
    } },
    '../api/favorites-api': { favoritesApi: {
      list: async () => ({ favorites: [{ productId: 'product' }] }),
      add: async () => { calls.push('favorite'); return {}; },
      remove: async () => { calls.push('unfavorite'); return {}; },
      ...overrides.favorites,
    } },
    '../api/order-api': { orderApi: {
      reorder: async () => ({}), place: async () => ({ order: { id: 'order' } }), ...overrides.orders,
    } },
  });
  const sessions = load('services/auth/session-scope.ts');
  const cart = load('services/cart/cart-queries.ts');
  const favorites = load('services/favorites/favorite-queries.ts');
  const orders = load('services/orders/order-queries.ts');
  const switchUser = (id, clear = true) => {
    session = sessions.setSessionUser(id);
    if (clear) client.clear();
    return session;
  };
  switchUser('A');
  t.after(() => client.clear());
  return {
    client, calls, cart, favorites, orders, sessions, switchUser,
    execute: (options, variables) => client.getMutationCache().build(client, options).execute(variables),
    seed: (quantity = 1) => {
      client.setQueryData(cart.cartKey(session), { items: [{ ...item, quantity }] });
      client.setQueryData(favorites.favoritesKey(session), { favorites: [{ productId: 'product' }] });
    },
    readCart: () => client.getQueryData(cart.cartKey(session)),
    readFavorites: () => client.getQueryData(favorites.favoritesKey(session)),
  };
}

test('cart and wishlist require a user and distinguish new logins to the same account', async (t) => {
  const h = setup(t);
  const firstKey = h.cart.useCart().queryKey;
  const firstFavoritesKey = h.favorites.useFavorites().queryKey;
  const oldScope = h.sessions.getSessionScope();
  assert.equal(h.sessions.setSessionUser('A'), oldScope, 'profile/mode updates preserve the session');
  h.switchUser(null);
  assert.equal(oldScope.signal.aborted, true);
  assert.equal(h.cart.useCart().enabled, false);
  assert.equal(h.favorites.useFavorites().enabled, false);
  await assert.rejects(h.cart.useCart().queryFn({}), /sign in/);
  await assert.rejects(h.execute(h.favorites.useToggleFavorite(), { productId: 'x', isFavorite: false }), /sign in/);
  h.switchUser('A');
  assert.notDeepEqual(h.cart.useCart().queryKey, firstKey);
  assert.notDeepEqual(h.favorites.useFavorites().queryKey, firstFavoritesKey);
  assert.deepEqual(h.calls, []);
});

for (const operation of ['add', 'quantity', 'remove', 'favorite']) {
  for (const failure of [false, true]) {
    test(`late ${operation} ${failure ? 'failure' : 'success'} cannot alter another session`, async (t) => {
      const pending = deferred();
      const h = setup(t, {
        cart: { addItem: () => pending.promise, updateQuantity: () => pending.promise, removeItem: () => pending.promise },
        favorites: { remove: () => pending.promise },
      });
      h.seed();
      const options = operation === 'add' ? h.cart.useAddCartItem()
        : operation === 'quantity' ? h.cart.useUpdateCartQuantity()
          : operation === 'remove' ? h.cart.useRemoveCartItem() : h.favorites.useToggleFavorite();
      const input = operation === 'quantity' ? { id: item.id, quantity: 4 }
        : operation === 'remove' ? item.id : { productId: 'product', color: '', size: '', isFavorite: true };
      const result = h.execute(options, input).catch((error) => error);
      await tick();
      const oldKey = h.cart.useCart().queryKey;
      h.switchUser(null);
      // Re-login as A as well as switching to B: user ID alone is insufficient.
      h.switchUser(failure ? 'A' : 'B');
      h.seed(9);
      let invalidations = 0;
      h.client.invalidateQueries = async () => { invalidations++; };
      if (failure) pending.reject(new Error('Offline'));
      else pending.resolve({ item: { ...item, quantity: 4 } });
      const error = await result;
      assert.ok(error instanceof Error);
      assert.equal(h.readCart().items[0].quantity, 9);
      assert.deepEqual(h.readFavorites().favorites, [{ productId: 'product' }]);
      assert.equal(h.client.getQueryData(oldKey), undefined);
      assert.equal(invalidations, 0);
    });
  }
}

test('queued old cart writes cannot execute under new cookies or block the new cart', async (t) => {
  const pending = deferred();
  let adds = 0;
  const h = setup(t, { cart: { addItem: () => { adds++; return pending.promise; } } });
  h.seed();
  const oldAdd = h.execute(h.cart.useAddCartItem(), { productId: 'product', color: '', size: '' }).catch((e) => e);
  await tick();
  const oldQueued = h.execute(h.cart.useUpdateCartQuantity(), { id: item.id, quantity: 2 }).catch((e) => e);
  await tick();
  // Keep old mutation objects to exercise actual queue resumption independently
  // of AuthProvider's cache.clear(), which removes their cache entries.
  h.switchUser('B', false);
  h.seed(8);
  assert.equal(h.cart.useCartPending(), false);
  await h.execute(h.cart.useRemoveCartItem(), item.id);
  assert.deepEqual(h.calls, ['remove']);
  pending.resolve({ item });
  const results = await Promise.all([oldAdd, oldQueued]);
  assert.ok(results.every((error) => error.kind === 'cancelled'));
  assert.equal(adds, 1);
  assert.deepEqual(h.calls, ['remove'], 'queued quantity API must never run');
  assert.deepEqual(h.readCart().items, []);
});

test('session change while cancelling a query prevents optimistic writes and API calls', async (t) => {
  for (const kind of ['cart', 'favorites']) {
    const h = setup(t);
    h.seed();
    const barrier = deferred();
    h.client.cancelQueries = () => barrier.promise;
    const options = kind === 'cart' ? h.cart.useUpdateCartQuantity() : h.favorites.useToggleFavorite();
    const result = h.execute(options, { id: item.id, quantity: 4, productId: 'product', isFavorite: true }).catch((e) => e);
    await tick();
    h.switchUser('B');
    h.seed(9);
    barrier.resolve();
    assert.equal((await result).kind, 'cancelled');
    assert.equal(h.readCart().items[0].quantity, 9);
    assert.deepEqual(h.readFavorites().favorites, [{ productId: 'product' }]);
    assert.deepEqual(h.calls, []);
  }
});

test('delayed cart and wishlist reads are rejected after logout and never recreate old caches', async (t) => {
  for (const kind of ['cart', 'favorites']) {
    const pending = deferred();
    const h = setup(t, { cart: { getCart: () => pending.promise }, favorites: { list: () => pending.promise } });
    const options = kind === 'cart' ? h.cart.useCart() : h.favorites.useFavorites();
    const read = h.client.fetchQuery(options).catch((error) => error);
    await tick();
    h.switchUser('B');
    h.seed(9);
    pending.resolve(kind === 'cart' ? { items: [item] } : { favorites: [{ productId: 'old-private-id' }] });
    await read;
    await tick();
    assert.equal(h.client.getQueryData(options.queryKey), undefined);
    assert.equal(h.readCart().items[0].quantity, 9);
    assert.deepEqual(h.readFavorites().favorites, [{ productId: 'product' }]);
  }
});

test('checkout and reorder refresh the current session cart only', async (t) => {
  const h = setup(t);
  const invalidations = [];
  h.client.invalidateQueries = async (filters) => { invalidations.push(filters); };
  await h.execute(h.orders.useReorder(), { id: 'order', items: [] });
  await h.execute(h.orders.usePlaceOrder(), {});
  const cartInvalidations = invalidations.filter((filters) => filters.queryKey[0] === 'cart');
  assert.equal(cartInvalidations.length, 2);
  assert.ok(cartInvalidations.every((filters) => filters.exact));
  assert.deepEqual(cartInvalidations[0].queryKey, h.cart.useCart().queryKey);
});

test('late checkout and reorder completion cannot invalidate a new login cart', async (t) => {
  for (const operation of ['useReorder', 'usePlaceOrder']) {
    const pending = deferred();
    const h = setup(t, { orders: { reorder: () => pending.promise, place: () => pending.promise } });
    const result = h.execute(h.orders[operation](), {}).catch((error) => error);
    await tick();
    h.switchUser('B');
    let invalidations = 0;
    h.client.invalidateQueries = async () => { invalidations++; };
    pending.resolve({ order: { id: 'order' } });
    assert.equal((await result).kind, 'cancelled');
    assert.equal(invalidations, 0);
  }
});
