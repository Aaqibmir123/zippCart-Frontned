const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceLoader } = require('./helpers/load-source.cjs');
const { fakeClock } = require('./helpers/hook-harness.cjs');

const tick = () => new Promise(setImmediate);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup(t, url = 'https://example.test/api/v1') {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = global.fetch;
  process.env.EXPO_PUBLIC_API_URL = url;
  t.after(() => {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  });
  const load = sourceLoader({ 'react-native': { TurboModuleRegistry: { get: () => null } } });
  return { load, ...load('services/api/client.ts') };
}

test('a pre-cancelled public request never reaches fetch', async (t) => {
  const { apiRequest } = setup(t);
  global.fetch = () => assert.fail('Cancelled request was sent');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(apiRequest('/products', { public: true, signal: controller.signal }), { kind: 'cancelled' });
});

for (const status of [200, 401]) {
  test(`cancellation rejects a late ${status} response without refreshing`, async (t) => {
    const { apiRequest, registerAuthSessionHandler } = setup(t);
    registerAuthSessionHandler({ hasSession: () => true, refresh: () => assert.fail('Cancelled request refreshed'),
      onInvalidSession: () => assert.fail('Logged out'), onRecoverableRefreshFailure: () => {} });
    const pending = deferred();
    global.fetch = () => pending.promise;
    const controller = new AbortController();
    const request = apiRequest('/products', { signal: controller.signal }).catch((error) => error);
    controller.abort();
    pending.resolve(new Response('{}', { status }));
    assert.equal((await request).kind, 'cancelled');
  });
}

for (const first of ['cancelled', 'timeout']) {
  test(`the first abort reason (${first}) survives delayed transport rejection`, async (t) => {
    const { apiRequest } = setup(t);
    const clock = fakeClock(t);
    const pending = deferred();
    global.fetch = () => pending.promise;
    const controller = new AbortController();
    const request = apiRequest('/products', { public: true, signal: controller.signal, timeoutMs: 10 }).catch((e) => e);
    if (first === 'cancelled') controller.abort();
    clock.advance(10);
    controller.abort();
    pending.reject(new TypeError('Transport stopped'));
    assert.equal((await request).kind, first);
    assert.equal(clock.timers.size, 0);
  });
}

for (const status of [200, 400]) {
  test(`timeout while reading a ${status} body is not masked by JSON parsing`, async (t) => {
    const { apiRequest } = setup(t);
    const clock = fakeClock(t);
    const body = deferred();
    global.fetch = async () => ({ ok: status === 200, status, json: () => body.promise });
    const request = apiRequest('/products', { public: true, timeoutMs: 10 }).catch((e) => e);
    await tick(); clock.advance(10);
    body.reject(new SyntaxError('Incomplete JSON'));
    assert.equal((await request).kind, 'timeout');
    assert.equal(clock.timers.size, 0);
  });
}

test('public request cancellation also rejects a late successful JSON body', async (t) => {
  const { apiRequest } = setup(t);
  const body = deferred();
  global.fetch = async () => ({ ok: true, status: 200, json: () => body.promise });
  const controller = new AbortController();
  const request = apiRequest('/products', { public: true, signal: controller.signal }).catch((e) => e);
  await tick(); controller.abort(); body.resolve({ products: [] });
  assert.equal((await request).kind, 'cancelled');
});

test('invalid success JSON is a response error; HTML HTTP failures retain their status', async (t) => {
  const { apiRequest } = setup(t);
  for (const [status, kind] of [[200, 'invalid_response'], [401, 'unauthorized'], [403, 'http'], [502, 'server']]) {
    global.fetch = async () => new Response('<html>Unexpected response</html>', { status });
    await assert.rejects(apiRequest('/products', { public: true }), { kind, status });
  }
  global.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await apiRequest('/products', { public: true }), undefined);
});

test('connection failures during fetch or body reading remain network errors', async (t) => {
  const { apiRequest } = setup(t);
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(apiRequest('/products', { public: true }), { kind: 'network' });
  global.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new TypeError('Connection lost'); } });
  await assert.rejects(apiRequest('/products', { public: true }), { kind: 'network' });
});

test('bad server messages cannot become object text; valid field issues and codes survive', async (t) => {
  const { apiRequest } = setup(t);
  for (const message of [{ private: 'do not expose' }, 12, null, ' ']) {
    global.fetch = async () => new Response(JSON.stringify({ message, code: 'VALIDATION_FAILED',
      issues: { city: ['Enter a city.'], phone: [null] } }), { status: 400 });
    await assert.rejects(apiRequest('/addresses'), (error) => {
      assert.equal(error.kind, 'http');
      assert.equal(error.message, 'Request failed. Please try again.');
      assert.equal(error.code, 'VALIDATION_FAILED');
      assert.deepEqual(error.issues, { city: ['Enter a city.'] });
      return true;
    });
  }
});

test('rate limits preserve numeric and HTTP-date Retry-After headers', async (t) => {
  const { apiRequest } = setup(t);
  t.mock.method(Date, 'now', () => Date.UTC(2026, 0, 1));
  for (const [header, seconds] of [['30', 30], ['0', 0], ['Thu, 01 Jan 2026 00:01:00 GMT', 60], ['invalid', undefined]]) {
    global.fetch = async () => new Response('{}', { status: 429, headers: { 'Retry-After': header } });
    await assert.rejects(apiRequest('/products', { public: true }), (error) => {
      assert.equal(error.status, 429); assert.equal(error.kind, 'http');
      assert.equal(error.retryAfterSeconds, seconds); return true;
    });
  }
});

test('invalid configuration and unserializable bodies fail before sending a request', async (t) => {
  const { apiRequest, load } = setup(t, 'not-a-url');
  global.fetch = () => assert.fail('Invalid request was sent');
  await assert.rejects(apiRequest('/products'), { kind: 'configuration' });
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test/api/v1';
  const valid = sourceLoader({ 'react-native': { TurboModuleRegistry: { get: () => null } } })('services/api/client.ts');
  const body = {}; body.self = body;
  await assert.rejects(valid.apiRequest('/addresses', { body }), { kind: 'invalid_request' });
  assert.equal(load('services/api/api-error.ts').classifySessionFailure(new Error('Unexpected')).reason, 'refresh_client_error');
});

for (const kind of ['network', 'timeout', 'server', 'invalid_response', 'cancelled']) {
  test(`concurrent refresh ${kind} failures preserve their cause and never log out`, async (t) => {
    const { apiRequest, registerAuthSessionHandler, load } = setup(t);
    const { createApiError, classifySessionFailure } = load('services/api/api-error.ts');
    const refresh = deferred(); let calls = 0, requests = 0; const notifications = [];
    const failure = createApiError('Refresh failed', { kind, ...(kind === 'server' ? { status: 503 } : {}) });
    registerAuthSessionHandler({ hasSession: () => true, refresh: () => { calls++; return refresh.promise; },
      onInvalidSession: () => assert.fail('Transient failure logged out'),
      onRecoverableRefreshFailure: (value) => notifications.push(value) });
    global.fetch = async () => { requests++; return new Response('{}', { status: 401 }); };
    const results = Promise.all(['/cart', '/favorites'].map((url) => apiRequest(url).catch((e) => e)));
    await tick(); assert.equal(calls, 1); refresh.reject(failure);
    assert.deepEqual(await results, [failure, failure]); assert.equal(requests, 2);
    assert.deepEqual(notifications, kind === 'cancelled' ? [] : [kind]);
    assert.equal(classifySessionFailure(failure).requiresLogin, false);
    if (kind !== 'network') assert.notEqual(classifySessionFailure(failure).reason, 'refresh_network_error');
  });
}

for (const fails of [false, true]) {
  test(`one cancelled caller cannot replay or cancel another caller's shared refresh (${fails ? 'failure' : 'success'})`, async (t) => {
    const { apiRequest, registerAuthSessionHandler, load } = setup(t);
    const refresh = deferred(); let ready = false, calls = 0; const paths = [];
    registerAuthSessionHandler({ hasSession: () => true, refresh: () => { calls++; return refresh.promise; },
      onInvalidSession: () => assert.fail('Wrong logout'), onRecoverableRefreshFailure: () => {} });
    global.fetch = async (url) => { paths.push(new URL(url).pathname); return new Response('{}', { status: ready ? 200 : 401 }); };
    const controller = new AbortController();
    const cancelled = apiRequest('/cart', { signal: controller.signal }).catch((e) => e);
    const other = apiRequest('/favorites').catch((e) => e);
    await tick(); controller.abort(); ready = true;
    if (fails) refresh.reject(load('services/api/api-error.ts').createApiError('Offline', { kind: 'network' }));
    else refresh.resolve({});
    assert.equal((await cancelled).kind, 'cancelled');
    if (fails) assert.equal((await other).kind, 'network');
    else assert.deepEqual(await other, {});
    assert.equal(calls, 1); assert.equal(paths.filter((path) => path.endsWith('/cart')).length, 1);
  });
}

test('query retry skips permanent failures and cancellation but allows one transient retry', () => {
  const load = sourceLoader();
  const client = load('services/query-client.ts').createQueryClient();
  const { createApiError } = load('services/api/api-error.ts');
  const retry = client.getDefaultOptions().queries.retry;
  for (const kind of ['cancelled', 'invalid_response', 'invalid_request', 'configuration']) {
    assert.equal(retry(0, createApiError('Error', { kind })), false);
  }
  for (const status of [400, 401, 403, 404, 429]) assert.equal(retry(0, createApiError('Error', { kind: 'http', status })), false);
  for (const kind of ['network', 'timeout', 'server']) {
    const error = createApiError('Error', { kind });
    assert.equal(retry(0, error), true); assert.equal(retry(1, error), false);
  }
  assert.equal(client.getDefaultOptions().mutations.retry, false);
  client.clear();
});
