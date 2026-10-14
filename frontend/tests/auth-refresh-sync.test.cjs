const test = require('node:test');
const assert = require('node:assert/strict');
const { QueryClient } = require('@tanstack/react-query');
const { sourceLoader } = require('./helpers/load-source.cjs');
const { hookHarness } = require('./helpers/hook-harness.cjs');

const tick = () => new Promise(setImmediate);
const account = (id = 'A', fields = {}) => ({ id, phone: 'test-phone', createdAt: '2026-01-01',
  fullName: 'Original', roles: ['customer'], storeStatus: 'pending', isActive: true, mode: 'customer', ...fields });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function setup(t, initial = account(), restoreMode = async () => 'none') {
  const originalFetch = global.fetch;
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test/api/v1';
  const hooks = hookHarness();
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
  let handler, transport, registrations = 0, clears = 0, markerClears = 0;
  const clear = queryClient.clear.bind(queryClient);
  queryClient.clear = () => { clears++; clear(); };
  const load = sourceLoader({
    react: { ...hooks.react, createContext: () => ({ Provider: 'AuthProvider' }),
      useMemo: (factory, deps) => {
        const memo = hooks.react.useRef();
        if (!memo.current || deps.some((value, index) => !Object.is(value, memo.current.deps[index]))) {
          memo.current = { deps, value: factory() };
        }
        return memo.current.value;
      } },
    'react-native': { TurboModuleRegistry: { get: () => null } },
    '@tanstack/react-query': { useQueryClient: () => queryClient },
    '../services/auth/session-storage': {
      getSessionRestoreMode: restoreMode, clearRetiredSessions: async () => {},
      markSessionMayExist: async () => {}, clearSessionMayExist: async () => { markerClears++; },
    },
    '../services/api/client': {
      registerAuthSessionHandler: (value) => { handler = value; registrations++; return transport.registerAuthSessionHandler(value); },
      setAuthRestoreInProgress: () => {},
    },
  });
  transport = load('services/api/client.ts');
  const sessions = load('services/auth/session-scope.ts');
  const { AuthProvider } = load('context/AuthContext.tsx');
  const render = () => hooks.render(() => AuthProvider({ children: null })).props.value;
  let unmounted = false;
  const unmount = () => { if (!unmounted) { unmounted = true; hooks.unmount(); } };
  t.after(() => {
    unmount(); clear(); global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  });
  render(); await tick(); render().setUser(initial, true); render();
  return { load, sessions, transport, queryClient, render, unmount, handler: () => handler,
    counts: () => ({ registrations, clears, markerClears }) };
}

test('delayed startup storage cannot clear a newer login', async (t) => {
  const mode = deferred();
  const f = await setup(t, account('B'), () => mode.promise);
  const current = f.render();
  mode.resolve('none'); await tick();
  assert.equal(f.render().user, current.user);
  assert.equal(f.render().session, current.session);
});

function startRefresh(fixture, paths = ['/cart']) {
  const refresh = deferred(); let refreshCalls = 0, authorized = false; const requests = [];
  global.fetch = async (url, options) => {
    assert.equal(options.credentials, 'include');
    const path = new URL(url).pathname;
    requests.push(path);
    if (path.endsWith('/auth/refresh')) { refreshCalls++; return refresh.promise; }
    return json(authorized ? { ok: true } : { message: 'Expired access token' }, authorized ? 200 : 401);
  };
  const results = Promise.all(paths.map((path) => fixture.transport.apiRequest(path, { method: 'GET' }).catch((e) => e)));
  return { results, requests, calls: () => refreshCalls,
    succeed: (user) => { authorized = true; refresh.resolve(json({ user })); },
    fail: (status) => status ? refresh.resolve(json({ message: 'Refresh failed', code: 'SESSION_REVOKED' }, status))
      : refresh.reject(new TypeError('Offline')) };
}

test('offline customer mode survives late and subsequent refreshes but resets on a new login', async (t) => {
  const seller = account('A', { mode: 'seller', roles: ['customer', 'seller'] });
  const f = await setup(t, seller);
  const pending = startRefresh(f); await tick();
  f.render().setUser({ ...seller, mode: 'customer' });
  pending.succeed(seller); await pending.results;
  assert.equal(f.render().user.mode, 'customer');
  const again = startRefresh(f); await tick(); again.succeed(seller); await again.results;
  assert.equal(f.render().user.mode, 'customer');
  f.render().setUser(seller, true);
  assert.equal(f.render().user.mode, 'seller');
});

test('API-triggered refresh synchronizes account fields without resetting session, caches, or welcome state', async (t) => {
  const f = await setup(t);
  const before = f.render(); const counts = f.counts();
  const cartKey = ['cart', before.session.userId, before.session.generation];
  f.queryClient.setQueryData(cartKey, { items: ['retained'] });
  const refresh = startRefresh(f);
  await tick();
  const next = account('A', { fullName: 'Updated', email: 'updated@example.test', profileImage: 'new-image',
    roles: ['customer', 'seller'], storeStatus: 'approved', mode: 'seller' });
  refresh.succeed(next);
  assert.deepEqual(await refresh.results, [{ ok: true }]);
  const after = f.render();
  assert.deepEqual(after.user, next); assert.equal(after.session, before.session);
  assert.equal(before.session.signal.aborted, false);
  assert.equal(after.isWelcomePending, true);
  assert.deepEqual(f.queryClient.getQueryData(cartKey), { items: ['retained'] });
  assert.deepEqual(f.counts(), counts); assert.equal(refresh.calls(), 1);
  assert.deepEqual(refresh.requests, ['/api/v1/cart', '/api/v1/auth/refresh', '/api/v1/cart']);
});

test('identical refreshed account data (including reordered roles) preserves user and context references', async (t) => {
  const f = await setup(t, account('A', { roles: ['customer', 'seller'] }));
  const before = f.render();
  const refresh = startRefresh(f); await tick();
  refresh.succeed({ ...before.user, roles: ['seller', 'customer'] }); await refresh.results;
  assert.equal(f.render().user, before.user);
  assert.equal(f.render(), before);
  assert.equal(f.counts().registrations, 1);
});

for (const transition of ['logout', 'different-user', 'same-user-new-login']) {
  for (const failed of [false, true]) {
    test(`late refresh ${failed ? '401' : 'success'} cannot change auth after ${transition}`, async (t) => {
      const f = await setup(t);
      const originalSession = f.render().session;
      const refresh = startRefresh(f); await tick();
      f.render().setUser(null);
      if (transition !== 'logout') f.render().setUser(account(transition === 'different-user' ? 'B' : 'A'), true);
      const active = f.render(); const counts = f.counts();
      assert.equal(originalSession.signal.aborted, true);
      if (failed) refresh.fail(401); else refresh.succeed(account('A', { roles: ['admin'] }));
      assert.equal((await refresh.results)[0].kind, 'cancelled');
      assert.equal(f.render().user, active.user); assert.equal(f.render().session, active.session);
      assert.equal(f.render().sessionRestoreIssue, false); assert.deepEqual(f.counts(), counts);
      assert.equal(refresh.requests.length, 2, 'Old request must not replay');
    });
  }
}

test('AuthContext itself checks session identity even if the refresh implementation returns a stale user', async (t) => {
  const f = await setup(t); const pending = deferred();
  f.load('services/api/auth-api.ts').authApi.refresh = () => pending.promise;
  const result = f.handler().refresh().catch((error) => error);
  f.render().setUser(account('B'), true); const current = f.render();
  pending.resolve({ user: account('A', { roles: ['admin'] }) });
  assert.equal((await result).kind, 'cancelled');
  assert.equal(f.render().user, current.user);
});

test('unmounted AuthProvider cannot synchronize a pending refresh response', async (t) => {
  const f = await setup(t); const before = f.render(); const pending = deferred();
  f.load('services/api/auth-api.ts').authApi.refresh = () => pending.promise;
  const result = f.handler().refresh().catch((error) => error);
  f.unmount(); pending.resolve({ user: account('A', { fullName: 'Stale' }) });
  assert.equal((await result).kind, 'cancelled');
  assert.equal(f.render().user, before.user);
});

test('a refresh returning a different account is rejected without switching users or replaying requests', async (t) => {
  const f = await setup(t); const before = f.render();
  const refresh = startRefresh(f); await tick(); refresh.succeed(account('B'));
  assert.equal((await refresh.results)[0].kind, 'invalid_response');
  assert.equal(f.render().user, before.user); assert.equal(f.render().session, before.session);
  assert.equal(refresh.requests.length, 2);
});

test('concurrent expired requests share one refresh and publish one synchronized user', async (t) => {
  const f = await setup(t); const before = f.render();
  const refresh = startRefresh(f, ['/cart', '/favorites', '/orders']); await tick();
  assert.equal(refresh.calls(), 1);
  const next = account('A', { storeStatus: 'approved', roles: ['customer', 'seller'] });
  refresh.succeed(next);
  assert.deepEqual(await refresh.results, [{ ok: true }, { ok: true }, { ok: true }]);
  assert.deepEqual(f.render().user, next); assert.equal(f.render().session, before.session);
  assert.equal(refresh.calls(), 1); assert.equal(refresh.requests.length, 7);
  assert.equal(f.counts().registrations, 1);
});

for (const status of [0, 503]) {
  test(`refresh ${status || 'network'} failure preserves auth; later successful refresh clears recovery state`, async (t) => {
    const f = await setup(t); const before = f.render(); const counts = f.counts();
    const failure = startRefresh(f); await tick(); failure.fail(status);
    assert.equal((await failure.results)[0].kind, status ? 'server' : 'network');
    assert.equal(f.render().user, before.user); assert.equal(f.render().session, before.session);
    assert.equal(f.render().sessionRestoreIssue, true); assert.deepEqual(f.counts(), counts);
    const success = startRefresh(f); await tick(); success.succeed(before.user); await success.results;
    assert.equal(f.render().sessionRestoreIssue, false); assert.equal(f.render().user, before.user);
  });
}

test('a current-session refresh 401 still logs out and clears session-scoped caches', async (t) => {
  const f = await setup(t); const before = f.render();
  const refresh = startRefresh(f); await tick(); refresh.fail(401); await refresh.results;
  assert.equal(f.render().user, null); assert.equal(f.render().session, null);
  assert.equal(before.session.signal.aborted, true); assert.equal(f.counts().markerClears, 1);
});

test('legacy retirement uses existing 401 contracts to clear private state and return to OTP login', async t => {
  const f = await setup(t);
  const original = f.render().session;
  f.queryClient.setQueryData(['private', 'A'], { secret: 'A-only' });
  const paths = [];
  global.fetch = async url => {
    const path = new URL(url).pathname;
    paths.push(path);
    return json({ message: 'Your session has expired. Please log in again.',
      code: path.endsWith('/auth/refresh') ? 'REFRESH_INVALID' : 'ACCESS_TOKEN_INVALID' }, 401);
  };
  await f.transport.apiRequest('/cart').catch(() => undefined);
  assert.equal(f.render().user, null);
  assert.equal(f.render().session, null);
  assert.equal(f.render().sessionRestoreIssue, false);
  assert.equal(original.signal.aborted, true);
  assert.equal(f.queryClient.getQueryData(['private', 'A']), undefined);
  assert.deepEqual(paths, ['/api/v1/cart', '/api/v1/auth/refresh']);
  assert.equal(navigationBranch(f.render()), 'AuthNavigator');
});

test('ordinary profile edits keep the session generation and allow an ongoing refresh to synchronize', async (t) => {
  const f = await setup(t); const before = f.render(); const counts = f.counts();
  const refresh = startRefresh(f); await tick();
  f.render().setUser({ ...before.user, fullName: 'Edited profile' });
  assert.equal(f.render().session, before.session); assert.equal(before.session.signal.aborted, false);
  refresh.succeed(account('A', { fullName: 'Edited profile', storeStatus: 'approved' })); await refresh.results;
  assert.equal(f.render().user.fullName, 'Edited profile'); assert.equal(f.render().user.storeStatus, 'approved');
  assert.equal(f.render().session, before.session); assert.deepEqual(f.counts(), counts);
});

function navigationBranch(auth) {
  const load = sourceLoader({
    '@react-navigation/native': { NavigationContainer: 'NavigationContainer' },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider' },
    '@tanstack/react-query': { QueryClientProvider: 'QueryClientProvider' },
    '../services/query-client': { createQueryClient: () => ({}) },
    '../components/QueryLifecycle': { QueryLifecycle: 'QueryLifecycle' },
    '../components/PendingLogoutRecovery': { PendingLogoutRecovery: 'PendingLogoutRecovery' },
    '../context/AuthContext': { AuthProvider: 'AuthProvider', useAuth: () => auth },
    '../components/SessionLoader': { SessionLoader: 'SessionLoader' },
    './AuthNavigator': { AuthNavigator: 'AuthNavigator' },
    './user/ShopNavigator': { ShopNavigator: 'ShopNavigator' },
    '../screens/seller/SellerModeScreen': { SellerModeScreen: 'SellerModeScreen' },
    './admin/AdminNavigator': { AdminNavigator: 'AdminNavigator' },
    '../features/notifications/NotificationProvider': { NotificationProvider: 'NotificationProvider' },
    '../features/auth/LoginWelcomeScreen': { LoginWelcomeScreen: 'LoginWelcomeScreen' },
    '../theme/ThemeProvider': { ThemeProvider: 'ThemeProvider' },
  });
  function find(tree) {
    if (Array.isArray(tree)) return tree.map(find).find(Boolean);
    if (!tree || typeof tree !== 'object') return undefined;
    return tree.type?.name === 'AppNavigator' ? tree.type : find(tree.props?.children);
  }
  const app = find(load('navigation/RootNavigator.tsx').RootNavigator());
  return app().props.children.type;
}

test('refreshed role, approval, activity, and mode drive existing customer/seller/admin navigation', async (t) => {
  const f = await setup(t); f.render().dismissWelcome();
  const session = f.render().session;
  const seller = { mode: 'seller', roles: ['customer', 'seller'], storeStatus: 'approved' };
  for (const [fields, screen] of [
    [{}, 'ShopNavigator'], [seller, 'SellerModeScreen'],
    [{ ...seller, storeStatus: 'rejected' }, 'ShopNavigator'],
    [{ ...seller, isActive: false }, 'ShopNavigator'],
    [{ ...seller, roles: ['customer'] }, 'ShopNavigator'],
    [{ roles: ['customer', 'admin'] }, 'AdminNavigator'], [{}, 'ShopNavigator'],
  ]) {
    const refresh = startRefresh(f); await tick(); refresh.succeed(account('A', fields)); await refresh.results;
    assert.equal(navigationBranch(f.render()), screen);
    assert.equal(f.render().session, session);
  }
});
