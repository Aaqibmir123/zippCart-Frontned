const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { QueryClient, QueryObserver } = require('@tanstack/react-query');
const { sourceLoader } = require('./helpers/load-source.cjs');

const first = { id: 'one', productId: 'p1', color: '', size: '', quantity: 1 };
const second = { id: 'two', productId: 'p2', color: 'Blue', size: 'M', quantity: 1 };
const tick = () => new Promise(setImmediate);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup(t, api = {}) {
  const sessions = sourceLoader()('services/auth/session-scope.ts');
  const session = sessions.setSessionUser('customer');
  const client = new QueryClient({ defaultOptions: {
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false, gcTime: Infinity },
  } });
  const cartApi = {
    getCart: async () => ({ items: [first] }),
    addItem: async () => ({ item: second }),
    updateQuantity: async (id, quantity) => ({ item: { ...first, id, quantity } }),
    removeItem: async () => ({ message: 'Removed' }),
    ...api,
  };
  const filename = path.resolve(__dirname, '../services/cart/cart-queries.ts');
  const target = new Module(filename);
  target.require = (name) => {
    if (name === '@tanstack/react-query') return {
      useMutation: (options) => options,
      useQuery: (options) => options,
      useQueryClient: () => client,
      useIsMutating: (filters) => client.isMutating(filters),
    };
    if (name === '../api/cart-api') return { cartApi };
    if (name === '../../context/AuthContext') return { useAuth: () => ({ session }) };
    if (name === '../auth/session-scope') return sessions;
    return require(name);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
  t.after(() => client.clear());
  const hooks = target.exports;
  const read = () => client.getQueryData(hooks.cartKey(session));
  const seed = (items) => client.setQueryData(hooks.cartKey(session), { items });
  const execute = (options, variables) => client.getMutationCache().build(client, options).execute(variables);
  const observe = () => {
    const observer = new QueryObserver(client, hooks.useCart());
    const unsubscribe = observer.subscribe(() => {});
    t.after(unsubscribe);
    return observer;
  };
  return { client, hooks, read, seed, execute, observe };
}

test('late cart read is aborted and cannot overwrite an optimistic quantity', async (t) => {
  const oldRead = deferred();
  const write = deferred();
  let signal;
  const h = setup(t, {
    getCart: (value) => { signal = value; return oldRead.promise; },
    updateQuantity: () => write.promise,
  });
  h.seed([first]);
  const staleFetch = h.client.fetchQuery({ ...h.hooks.useCart(), staleTime: 0 }).catch(() => {});
  await tick();
  const mutation = h.execute(h.hooks.useUpdateCartQuantity(), { id: first.id, quantity: 3 });
  await tick();
  assert.equal(signal.aborted, true);
  assert.equal(h.read().items[0].quantity, 3);
  assert.equal(h.hooks.useCart().enabled, false);
  oldRead.resolve({ items: [first] });
  await staleFetch;
  assert.equal(h.read().items[0].quantity, 3);
  write.resolve({ item: { ...first, quantity: 3 } });
  await mutation;
  assert.equal(h.read().items[0].quantity, 3);
  assert.equal(h.hooks.useCart().enabled, true);
});

test('failed quantity update rolls back only its quantity, preserving other cart changes', async (t) => {
  const write = deferred();
  const h = setup(t, { updateQuantity: () => write.promise });
  h.seed([first, second]);
  const result = h.execute(h.hooks.useUpdateCartQuantity(), { id: first.id, quantity: 4 })
    .catch((error) => error);
  await tick();
  const product = { id: 'p1', price: 120 };
  h.seed([{ ...h.read().items[0], product }, { ...second, quantity: 7 }]);
  write.reject(new Error('Out of stock'));
  assert.match((await result).message, /Out of stock/);
  assert.deepEqual(h.read().items, [{ ...first, product }, { ...second, quantity: 7 }]);
});

test('rollback does not resurrect an item removed during the request', async (t) => {
  const write = deferred();
  const h = setup(t, { updateQuantity: () => write.promise });
  h.seed([first, second]);
  const result = h.execute(h.hooks.useUpdateCartQuantity(), { id: first.id, quantity: 4 }).catch(() => {});
  await tick();
  h.seed([second]);
  write.reject(new Error('Missing item'));
  await result;
  assert.deepEqual(h.read().items, [second]);
});

test('queued quantity writes run in order without restoring an earlier optimistic snapshot', async (t) => {
  const writes = [deferred(), deferred()];
  const calls = [];
  const h = setup(t, { updateQuantity: (_id, quantity) => {
    calls.push(quantity);
    return writes[calls.length - 1].promise;
  } });
  h.seed([first]);
  const one = h.execute(h.hooks.useUpdateCartQuantity(), { id: first.id, quantity: 2 }).catch(() => {});
  await tick();
  const two = h.execute(h.hooks.useUpdateCartQuantity(), { id: first.id, quantity: 3 }).catch(() => {});
  await tick();
  assert.deepEqual(calls, [2]);
  assert.equal(h.read().items[0].quantity, 2);
  writes[0].reject(new Error('First failed'));
  await one;
  await tick();
  assert.deepEqual(calls, [2, 3]);
  writes[1].reject(new Error('Second failed'));
  await two;
  assert.equal(h.read().items[0].quantity, 1);
});

test('add, quantity and remove share a queue and reconcile once after the final write', async (t) => {
  const add = deferred();
  const calls = [];
  let reads = 0;
  const h = setup(t, {
    getCart: async () => { reads++; return { items: [] }; },
    addItem: () => { calls.push('add'); return add.promise; },
    updateQuantity: async (_id, quantity) => { calls.push('quantity'); return { item: { ...first, quantity } }; },
    removeItem: async () => { calls.push('remove'); return {}; },
  });
  h.seed([first]);
  h.observe();
  const one = h.execute(h.hooks.useAddCartItem(), { productId: 'p1', color: '', size: '' });
  await tick();
  const two = h.execute(h.hooks.useUpdateCartQuantity(), { id: first.id, quantity: 3 });
  const three = h.execute(h.hooks.useRemoveCartItem(), first.id);
  await tick();
  assert.deepEqual(calls, ['add']);
  assert.equal(reads, 0);
  add.resolve({ item: { ...first, quantity: 2 } });
  await Promise.all([one, two, three]);
  assert.deepEqual(calls, ['add', 'quantity', 'remove']);
  assert.equal(reads, 1);
  assert.deepEqual(h.read().items, []);
});

test('a read started during a write is cancelled before applying its successful response', async (t) => {
  const read = deferred();
  const write = deferred();
  let signal;
  const h = setup(t, {
    getCart: (value) => { signal = value; return read.promise; },
    removeItem: () => write.promise,
  });
  h.seed([first]);
  const result = h.execute(h.hooks.useRemoveCartItem(), first.id);
  await tick();
  const pendingRead = h.client.fetchQuery({ ...h.hooks.useCart(), staleTime: 0 }).catch(() => {});
  await tick();
  write.resolve({});
  await result;
  assert.equal(signal.aborted, true);
  read.resolve({ items: [first] });
  await pendingRead;
  assert.deepEqual(h.read().items, []);
});

test('lost write response still reconciles with the server on failure', async (t) => {
  const h = setup(t, {
    updateQuantity: async () => { throw new Error('Response timed out'); },
    getCart: async () => ({ items: [{ ...first, quantity: 4 }] }),
  });
  h.seed([first]);
  h.observe();
  await assert.rejects(h.execute(h.hooks.useUpdateCartQuantity(), { id: first.id, quantity: 4 }), /timed out/);
  assert.equal(h.read().items[0].quantity, 4);
});

test('successful responses retain embedded products and safely handle an empty cache', async (t) => {
  const h = setup(t);
  const product = { id: 'p1', name: 'Boots' };
  h.seed([{ ...first, product }]);
  await h.execute(h.hooks.useUpdateCartQuantity(), { id: first.id, quantity: 3 });
  assert.deepEqual(h.read().items, [{ ...first, product, quantity: 3 }]);
  h.client.removeQueries({ queryKey: h.hooks.cartQueryKey });
  await h.execute(h.hooks.useRemoveCartItem(), first.id);
  assert.equal(h.read(), undefined);
});

test('disabled cart observers defer reconciliation until writes finish and then fetch once', async (t) => {
  const write = deferred();
  let reads = 0;
  const h = setup(t, {
    updateQuantity: () => write.promise,
    getCart: async () => { reads++; return { items: [{ ...first, quantity: 3 }] }; },
  });
  h.seed([first]);
  const observer = h.observe();
  const result = h.execute(h.hooks.useUpdateCartQuantity(), { id: first.id, quantity: 3 });
  await tick();
  observer.setOptions(h.hooks.useCart());
  await h.client.invalidateQueries({ queryKey: h.hooks.cartQueryKey });
  assert.equal(reads, 0);
  write.resolve({ item: { ...first, quantity: 3 } });
  await result;
  assert.equal(reads, 0);
  observer.setOptions(h.hooks.useCart());
  await tick();
  assert.equal(reads, 1);
  assert.equal(h.read().items[0].quantity, 3);
});

test('cart API forwards query cancellation to the HTTP client', async () => {
  const filename = path.resolve(__dirname, '../services/api/cart-api.ts');
  const target = new Module(filename);
  let request;
  target.require = (name) => {
    assert.equal(name, './client');
    return { apiRequest: async (url, options) => { request = { url, options }; return { items: [] }; } };
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
  const controller = new AbortController();
  await target.exports.cartApi.getCart(controller.signal);
  assert.equal(request.url, '/cart');
  assert.equal(request.options.signal, controller.signal);
});
