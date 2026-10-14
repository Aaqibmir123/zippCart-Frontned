const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceLoader } = require('./helpers/load-source.cjs');
const { fakeClock } = require('./helpers/hook-harness.cjs');
const tick = () => new Promise(setImmediate);
const deferred = () => {
  let resolve; const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

function fixture(t, pending = true) {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = global.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test/api/v1';
  const values = new Map(pending ? [['zippcart.auth.logoutPending.v1', 'true']] : []);
  const storage = { getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => values.set(key, value), removeItem: async key => values.delete(key) };
  const load = sourceLoader({ '@react-native-async-storage/async-storage': storage,
    'react-native': { TurboModuleRegistry: { get: () => null } } });
  const sessions = load('services/auth/session-scope.ts');
  const { retryPendingLogout } = load('services/auth/pending-logout.ts');
  const { authApi } = load('services/api/auth-api.ts');
  const paths = [];
  global.fetch = async url => {
    paths.push(new URL(url).pathname);
    return new Response(null, { status: 204 });
  };
  t.after(() => {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  });
  return { load, sessions, retryPendingLogout, authApi, paths, values, storage };
}

test('reconnect revokes without login, deduplicates attempts, and stops after success', async t => {
  const f = fixture(t);
  const first = f.retryPendingLogout();
  assert.equal(first, f.retryPendingLogout());
  await first;
  await f.retryPendingLogout();
  assert.deepEqual(f.paths, ['/api/v1/auth/logout']);
  assert.equal(f.values.has('zippcart.auth.logoutPending.v1'), false);
});

test('failed reconnect preserves pending state; successful retry clears it', async t => {
  const f = fixture(t);
  const fetchSuccess = global.fetch;
  global.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(f.retryPendingLogout(), { kind: 'network' });
  assert.equal(f.values.get('zippcart.auth.logoutPending.v1'), 'true');
  global.fetch = fetchSuccess;
  await f.retryPendingLogout();
  assert.equal(f.values.has('zippcart.auth.logoutPending.v1'), false);
});

test('a delayed pending-marker read cannot send logout with User B cookies', async t => {
  const f = fixture(t); const read = deferred();
  f.storage.getItem = () => read.promise;
  const result = f.retryPendingLogout().catch(e => e);
  await tick(); f.sessions.setSessionUser('B'); read.resolve('true');
  assert.equal((await result).kind, 'cancelled');
  await f.retryPendingLogout();
  assert.deepEqual(f.paths, []);
});

test('login waits for reconnect logout and no queued retry logs out the new cookies', async t => {
  const f = fixture(t); const response = deferred();
  global.fetch = async url => {
    f.paths.push(new URL(url).pathname);
    return f.paths.length === 1 ? response.promise : new Response(JSON.stringify({ user: { id: 'B' } }));
  };
  const recovery = f.retryPendingLogout(); await tick();
  const login = f.authApi.verifyOtp('phone', 'code');
  await tick(); assert.deepEqual(f.paths, ['/api/v1/auth/logout']);
  response.resolve(new Response(null, { status: 204 }));
  await recovery; await login;
  await f.retryPendingLogout(); // Even before React publishes B, the marker is gone.
  f.sessions.setSessionUser('B'); await f.retryPendingLogout();
  assert.deepEqual(f.paths, ['/api/v1/auth/logout', '/api/v1/auth/otp/verify']);
});

test('reconnect queued behind login cannot revoke its newly issued cookies', async t => {
  const f = fixture(t, false); const response = deferred();
  global.fetch = async url => { f.paths.push(new URL(url).pathname); return response.promise; };
  const login = f.authApi.verifyOtp('phone', 'code'); await tick();
  const recovery = f.retryPendingLogout();
  response.resolve(new Response(JSON.stringify({ user: { id: 'B' } })));
  await login; await recovery;
  assert.deepEqual(f.paths, ['/api/v1/auth/otp/verify']);
});

test('OTP send does not wait for pending logout or retry SMS', async t => {
  const f = fixture(t); const response = deferred();
  const lock = f.load('services/auth/credential-lock.ts');
  const blocked = lock.withCredentialLock(() => response.promise);
  await f.authApi.requestOtp('phone');
  assert.deepEqual(f.paths, ['/api/v1/auth/otp/request']);
  assert.equal(f.values.get('zippcart.auth.logoutPending.v1'), 'true');
  response.resolve(); await blocked;
});

test('OTP response after the provider deadline still reaches the app within its separate network deadline', async t => {
  const f = fixture(t); const clock = fakeClock(t); const response = deferred();
  let signal, calls = 0;
  global.fetch = (_url, options) => { calls++; signal = options.signal; return response.promise; };
  const request = f.authApi.requestOtp('phone');
  clock.advance(12000);
  assert.equal(signal.aborted, false);
  response.resolve(new Response(JSON.stringify({ delivery: '2factor' })));
  assert.deepEqual(await request, { delivery: '2factor' });
  assert.equal(calls, 1); assert.equal(clock.timers.size, 0);
});

function recoveryFixture(t, error) {
  const clock = fakeClock(t); let foreground = true, listener, calls = 0, failure = error;
  const load = sourceLoader({ './pending-logout': { retryPendingLogout: async () => { calls++; if (failure) throw failure; } } });
  const { startLogoutRecovery } = load('services/auth/logout-recovery.ts');
  const stop = startLogoutRecovery({ isForeground: () => foreground, subscribe: fn => { listener = fn; return () => { listener = null; }; } });
  t.after(stop);
  return { clock, stop, calls: () => calls, succeed: () => { failure = null; },
    state: value => { foreground = value; listener?.(); } };
}

test('foreground reconnect retries with backoff, pauses in background, and stops after success', async t => {
  const f = recoveryFixture(t, new Error('offline')); await tick();
  assert.equal(f.calls(), 1);
  f.clock.advance(5000); await tick(); assert.equal(f.calls(), 2);
  f.state(false); f.clock.advance(60000); await tick(); assert.equal(f.calls(), 2);
  f.succeed(); f.state(true); await tick(); assert.equal(f.calls(), 3);
  f.clock.advance(600000); await tick(); assert.equal(f.calls(), 3);
  f.stop(); assert.equal(f.clock.timers.size, 0);
});

test('foreground storms cannot bypass server Retry-After', async t => {
  const f = recoveryFixture(t, Object.assign(new Error('rate limited'), { isApiError: true, status: 429, retryAfterSeconds: 60 }));
  await tick(); f.clock.advance(5000);
  for (let i = 0; i < 5; i++) { f.state(false); f.state(true); }
  await tick(); assert.equal(f.calls(), 1);
  f.clock.advance(55000); await tick(); assert.equal(f.calls(), 2);
});
