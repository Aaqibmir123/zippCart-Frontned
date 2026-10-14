const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceLoader } = require('./helpers/load-source.cjs');

const tick = () => new Promise(setImmediate);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const unauthorized = () => ({ ok: false, status: 401, headers: new Headers(), json: async () => ({ message: 'Expired' }) });
const success = (data) => ({ ok: true, status: 200, json: async () => data });

test('a delayed old 401 reuses the completed refresh instead of rotating again', async (t) => {
  const { client } = setup(t);
  const delayed = deferred(); let calls = 0, refreshes = 0;
  client.registerAuthSessionHandler({ hasSession: () => true, refresh: async () => { refreshes++; },
    onInvalidSession: () => assert.fail('unexpected logout'), onRecoverableRefreshFailure: () => {} });
  global.fetch = async () => ++calls === 1 ? delayed.promise : calls === 2 ? unauthorized() : success({ ok: true });
  const slow = client.apiRequest('/slow');
  await client.apiRequest('/fast');
  delayed.resolve(unauthorized());
  assert.deepEqual(await slow, { ok: true });
  assert.equal(refreshes, 1);
  assert.equal(calls, 4);
});

test('direct refreshes share a request and logout waits for its cookie response to settle', async (t) => {
  const { client, sessions } = setup(t);
  const pending = deferred(); const paths = [];
  global.fetch = async (url) => { paths.push(new URL(url).pathname); return paths.length === 1 ? pending.promise : success({}); };
  const first = client.apiRequest('/auth/refresh');
  const second = client.apiRequest('/auth/refresh');
  assert.equal(first, second);
  const settled = first.catch((e) => e);
  await tick(); sessions.setSessionUser(null);
  const logout = client.apiRequest('/auth/logout');
  await tick(); assert.equal(paths.length, 1);
  pending.resolve(success({ user: 'A' }));
  assert.equal((await settled).kind, 'cancelled');
  await logout;
  assert.deepEqual(paths, ['/api/v1/auth/refresh', '/api/v1/auth/logout']);
});
function setup(t) {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = global.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test/api/v1';
  const load = sourceLoader({ 'react-native': { TurboModuleRegistry: { get: () => null } } });
  const sessions = load('services/auth/session-scope.ts');
  const client = load('services/api/client.ts');
  sessions.setSessionUser('A');
  t.after(() => {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  });
  return { load, sessions, client };
}

test('HTTP validation failures preserve field messages and discard malformed issue entries', async (t) => {
  const { client } = setup(t);
  global.fetch = async () => ({ ok: false, status: 400, headers: new Headers(), json: async () => ({
    message: 'Invalid request.', issues: { locality: ['Enter your area.'], state: [null, 42, 'State is too long.'],
      phone: 'malformed', name: [null, ' '], city: { message: 'malformed' } },
  }) });
  await assert.rejects(client.apiRequest('/addresses', { body: {} }), (error) => {
    assert.equal(error.status, 400);
    assert.deepEqual(error.issues, { locality: ['Enter your area.'], state: ['State is too long.'] });
    return true;
  });
});

test('session transition aborts protected HTTP requests and rejects late successful bodies', async (t) => {
  const { client, sessions } = setup(t);
  const response = deferred();
  let signal;
  global.fetch = (_url, options) => { signal = options.signal; return response.promise; };
  const request = client.apiRequest('/cart/items', { body: { quantity: 1 } }).catch((error) => error);
  sessions.setSessionUser('B');
  assert.equal(signal.aborted, true);
  // Even a transport that delivers a response despite abort cannot publish it.
  response.resolve(success({ item: 'A-private-item' }));
  assert.equal((await request).kind, 'cancelled');
});

test('a delayed 401 from an old session never starts a refresh for the new session', async (t) => {
  const { client, sessions } = setup(t);
  const response = deferred();
  let refreshes = 0;
  client.registerAuthSessionHandler({ hasSession: () => true,
    refresh: async () => { refreshes++; }, onInvalidSession: () => assert.fail('Wrong logout'),
    onRecoverableRefreshFailure: () => assert.fail('Wrong refresh error'),
  });
  global.fetch = () => response.promise;
  const request = client.apiRequest('/favorites/item', { method: 'PUT' }).catch((error) => error);
  sessions.setSessionUser('B');
  response.resolve(unauthorized());
  assert.equal((await request).kind, 'cancelled');
  assert.equal(refreshes, 0);
});

for (const failure of [false, true]) {
  test(`old refresh ${failure ? 'failure' : 'success'} cannot replay a write or invalidate a new session`, async (t) => {
    const { client, sessions, load } = setup(t);
    const refresh = deferred();
    let refreshes = 0, requests = 0, invalidations = 0;
    client.registerAuthSessionHandler({ hasSession: () => true,
      refresh: () => { refreshes++; return refresh.promise; },
      onInvalidSession: () => { invalidations++; },
      onRecoverableRefreshFailure: () => { invalidations++; },
    });
    global.fetch = async () => { requests++; return unauthorized(); };
    const request = client.apiRequest('/cart/items', { body: { quantity: 1 } }).catch((error) => error);
    await tick();
    assert.equal(refreshes, 1);
    sessions.setSessionUser(null);
    sessions.setSessionUser('A');
    if (failure) refresh.reject(load('services/api/api-error.ts').createApiError('Revoked', { status: 401 }));
    else refresh.resolve({});
    assert.equal((await request).kind, 'cancelled');
    assert.equal(requests, 1);
    assert.equal(invalidations, 0);
  });
}

test('a new account does not share the previous account refresh promise', async (t) => {
  const { client, sessions } = setup(t);
  const oldRefresh = deferred();
  let refreshes = 0, newAccountRefreshed = false;
  client.registerAuthSessionHandler({ hasSession: () => true,
    refresh: async () => {
      refreshes++;
      if (sessions.getSessionScope().userId === 'A') return oldRefresh.promise;
      newAccountRefreshed = true;
    },
    onInvalidSession: () => assert.fail('Wrong logout'), onRecoverableRefreshFailure: () => {},
  });
  global.fetch = async () => newAccountRefreshed ? success({ favorites: [] }) : unauthorized();
  const old = client.apiRequest('/cart').catch((error) => error);
  await tick();
  sessions.setSessionUser('B');
  assert.deepEqual(await client.apiRequest('/favorites'), { favorites: [] });
  assert.equal(refreshes, 2);
  oldRefresh.resolve({});
  assert.equal((await old).kind, 'cancelled');
});

test('public catalog requests survive account changes and wishlist reads forward abort signals', async (t) => {
  const { client, sessions, load } = setup(t);
  const response = deferred();
  let signal;
  global.fetch = (_url, options) => { signal = options.signal; return response.promise; };
  const catalog = client.apiRequest('/products', { public: true, method: 'GET' });
  sessions.setSessionUser('B');
  assert.equal(signal.aborted, false);
  response.resolve(success({ products: [] }));
  assert.deepEqual(await catalog, { products: [] });
  const abort = new AbortController();
  global.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
  });
  const wishlist = load('services/api/favorites-api.ts').favoritesApi.list(abort.signal).catch((error) => error);
  abort.abort();
  assert.ok(await wishlist instanceof Error);
});

test('AuthProvider changes session identity before clearing caches and preserves it for profile updates', () => {
  let value, sessionAtClear;
  let sessions;
  const load = sourceLoader({
    react: {
      createContext: () => ({ Provider: 'Provider' }), useState: (value) => [value, () => {}],
      useRef: (value) => ({ current: value }), useCallback: (fn) => fn,
      useEffect: () => {}, useMemo: (factory) => { value = factory(); return value; },
    },
    '@tanstack/react-query': { useQueryClient: () => ({ clear: () => { sessionAtClear = sessions.getSessionScope(); } }) },
    '../services/api/auth-api': {}, '../services/auth/session-storage': {},
    '../services/auth/auth-startup': {}, '../services/api/client': {},
  });
  sessions = load('services/auth/session-scope.ts');
  load('context/AuthContext.tsx').AuthProvider({ children: null });
  value.setUser({ id: 'A' });
  const first = sessions.getSessionScope();
  assert.equal(first, sessionAtClear);
  value.setUser({ id: 'A', fullName: 'Updated' });
  assert.equal(sessions.getSessionScope(), first);
  value.setUser(null);
  assert.equal(first.signal.aborted, true);
  value.setUser({ id: 'A' }, true);
  assert.notEqual(sessions.getSessionScope(), first);
  const login = sessions.getSessionScope();
  value.setUser({ id: 'A' }, true);
  assert.notEqual(sessions.getSessionScope(), login, 'explicit new login renews even the same user');
});

test('session cancellations are not retried as network failures', () => {
  const load = sourceLoader();
  const client = load('services/query-client.ts').createQueryClient();
  const { createApiError } = load('services/api/api-error.ts');
  const retry = client.getDefaultOptions().queries.retry;
  assert.equal(retry(0, createApiError('Session changed', { kind: 'cancelled' })), false);
  assert.equal(retry(0, createApiError('Offline', { kind: 'network' })), true);
  client.clear();
});
