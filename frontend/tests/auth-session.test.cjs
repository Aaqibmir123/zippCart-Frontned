const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = Module.createRequire(path.resolve(__dirname, '../package.json'))('typescript');

function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const target = new Module(filename);
  target.require = (name) => {
    if (name === 'react-native') return { TurboModuleRegistry: { get: () => null } };
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.ts')), mocks);
    throw new Error('Unexpected dependency: ' + name);
  };
  target._compile(output, filename);
  return target.exports;
}

test('cart sends the selected product quantity and defaults existing callers to one', async () => {
  const requests = [];
  const { cartApi } = load('services/api/cart-api.ts', { './client': {
    apiRequest: async (url, options) => { requests.push({ url, ...options }); },
  } });
  await cartApi.addItem({ productId: 'shirt', color: 'Lavender', size: 'M', quantity: 3 });
  await cartApi.addItem({ productId: 'shirt', color: 'White', size: 'S' });
  assert.equal(requests[0].body.quantity, 3);
  assert.equal(requests[1].body.quantity, 1);
});

test('retired sessions are removed without deleting onboarding or account storage', async () => {
  const values = new Map([
    ['zippcart.guest.active.v1', 'true'], ['zippcart.guest.data.v1', '{"cart":[]}'],
    ['account-session', 'preserve'],
  ]);
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    multiRemove: async (keys) => { keys.forEach((key) => values.delete(key)); },
  };
  const session = load('services/auth/session-storage.ts', { '@react-native-async-storage/async-storage': storage });
  assert.equal(await session.hasSeenOnboarding(), false);
  await session.completeOnboarding();
  await session.clearRetiredSessions();
  await session.clearRetiredSessions();
  assert.equal(await session.hasSeenOnboarding(), true);
  assert.equal(values.get('account-session'), 'preserve');
  assert.equal(values.size, 2);
});

test('pending local logout survives restart and clears after a successful login', async () => {
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
    multiRemove: async (keys) => { keys.forEach((key) => values.delete(key)); },
  };
  const session = load('services/auth/session-storage.ts', { '@react-native-async-storage/async-storage': storage });
  assert.equal(await session.hasPendingLogout(), false);
  await session.setPendingLogout();
  assert.equal(await session.hasPendingLogout(), true);
  await session.clearPendingLogout();
  assert.equal(await session.hasPendingLogout(), false);
});

test('fresh install skips session refresh when no prior app storage exists', async () => {
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    getAllKeys: async () => [...values.keys()],
    multiRemove: async (keys) => { keys.forEach((key) => values.delete(key)); },
  };
  const session = load('services/auth/session-storage.ts', { '@react-native-async-storage/async-storage': storage });

  assert.equal(await session.getSessionRestoreMode(), 'none');
  assert.equal(values.get('zippcart.auth.sessionMayExist.v1'), 'no');
});

test('an explicit pending logout bypasses refresh and records no possible session', async () => {
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    getAllKeys: async () => [...values.keys()],
    multiRemove: async (keys) => { keys.forEach((key) => values.delete(key)); },
  };
  const session = load('services/auth/session-storage.ts', { '@react-native-async-storage/async-storage': storage });

  await session.setPendingLogout();
  assert.equal(await session.getSessionRestoreMode(), 'none');
  assert.equal(values.get('zippcart.auth.sessionMayExist.v1'), 'no');
});

test('a valid marker restores session and a successful restore selects the app', async () => {
  const values = new Map([['zippcart.auth.sessionMayExist.v1', 'yes']]);
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    getAllKeys: async () => [...values.keys()],
    multiRemove: async (keys) => { keys.forEach((key) => values.delete(key)); },
  };
  const session = load('services/auth/session-storage.ts', { '@react-native-async-storage/async-storage': storage });
  const { startupRestoreOutcome } = load('services/auth/auth-startup.ts');

  assert.equal(await session.getSessionRestoreMode(), 'may-exist');
  assert.equal(startupRestoreOutcome(true), 'app');
});

test('invalid, expired, or revoked refresh sessions select login', () => {
  const { startupRestoreOutcome } = load('services/auth/auth-startup.ts');
  const { createApiError } = load('services/api/api-error.ts');

  for (const code of ['REFRESH_INVALID', 'REFRESH_EXPIRED', 'SESSION_REVOKED']) {
    assert.equal(startupRestoreOutcome(false,
      createApiError('Session invalid', { kind: 'unauthorized', status: 401, code })), 'login');
  }
});

test('possible-session network and server failures select retry UI', () => {
  const { startupRestoreOutcome } = load('services/auth/auth-startup.ts');
  const { createApiError } = load('services/api/api-error.ts');

  assert.equal(startupRestoreOutcome(false, createApiError('Offline', { kind: 'network' })), 'retry');
  assert.equal(startupRestoreOutcome(false, createApiError('Timed out', { kind: 'timeout' })), 'retry');
  assert.equal(startupRestoreOutcome(false, createApiError('Unavailable', { kind: 'server', status: 503 })), 'retry');
});

test('upgrade without the new marker restores when legacy app storage exists', async () => {
  const values = new Map([['zippcart.theme.mode.v1', 'dark']]);
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    getAllKeys: async () => [...values.keys()],
    multiRemove: async (keys) => { keys.forEach((key) => values.delete(key)); },
  };
  const session = load('services/auth/session-storage.ts', { '@react-native-async-storage/async-storage': storage });

  assert.equal(await session.getSessionRestoreMode(), 'may-exist');
  assert.equal(values.get('zippcart.auth.sessionMayExist.v1'), 'yes');
});

test('account deletion sends the confirmation OTP through the authenticated API', async () => {
  let call;
  const { authApi } = load('services/api/auth-api.ts', { './client': {
    apiRequest: async (...args) => { call = args; },
  } });
  await authApi.deleteAccount('123456');
  assert.equal(call[0], '/auth/account/delete');
  assert.deepEqual(call[1], { body: { code: '123456' } });
});

test('local API follows the Expo LAN host without altering production or hosted APIs', () => {
  const { resolveApiUrl } = load('services/api/api-url.ts');
  assert.equal(resolveApiUrl('http://10.210.116.173:4000/api/v1', '192.168.1.46:8081', true), 'http://192.168.1.46:4000/api/v1');
  assert.equal(resolveApiUrl('http://10.210.116.173:4000/api/v1', 'http://192.168.1.46:8081/index.bundle?platform=android', true), 'http://192.168.1.46:4000/api/v1');
  assert.equal(resolveApiUrl('https://api.zippcart.in/api/v1', '192.168.1.46:8081', true), 'https://api.zippcart.in/api/v1');
  assert.equal(resolveApiUrl('http://10.0.0.1:4000/api/v1', '192.168.1.46:8081', false), 'http://10.0.0.1:4000/api/v1');
  assert.equal(resolveApiUrl('http://10.0.0.1:4000/api/v1', 'tunnel.expo.dev', true), 'http://10.0.0.1:4000/api/v1');
});

test('API uses server credentials and fails closed when the backend is unavailable', async () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = global.fetch;
  try {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.zippcart.in/api/v1/';
    const client = load('services/api/client.ts');
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://api.zippcart.in/api/v1/auth/refresh');
      assert.equal(options.credentials, 'include');
      return { ok: true, status: 200, json: async () => ({ user: { id: 'server-account' } }) };
    };
    assert.deepEqual(await client.apiRequest('/auth/refresh'), { user: { id: 'server-account' } });
    global.fetch = async () => { throw new Error('Offline'); };
    await assert.rejects(client.apiRequest('/auth/refresh'), (error) => error.kind === 'network');
    global.fetch = async () => ({ ok: false, status: 401, headers: new Headers(), json: async () => ({ message: 'Session expired' }) });
    await assert.rejects(client.apiRequest('/auth/refresh'), /Session expired/);
    global.fetch = async () => ({ ok: false, status: 503, headers: new Headers(), json: async () => ({ message: 'Unavailable' }) });
    await assert.rejects(client.apiRequest('/auth/refresh'), (error) => error.kind === 'server' && error.status === 503);
    global.fetch = async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
    });
    await assert.rejects(client.apiRequest('/auth/refresh', { timeoutMs: 1 }), (error) => error.kind === 'timeout');
    delete process.env.EXPO_PUBLIC_API_URL;
    global.fetch = async () => assert.fail('Missing configuration must not send a request');
    await assert.rejects(load('services/api/client.ts').apiRequest('/auth/refresh'), /API configuration/);
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
});

test('development OTP requests refuse hosted API URLs', async () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = global.fetch;
  const originalDev = global.__DEV__;
  try {
    global.__DEV__ = true;
    process.env.EXPO_PUBLIC_API_URL = 'https://api.zippcart.online/api/v1';
    global.fetch = async () => assert.fail('Development OTP must not contact a hosted backend');
    await assert.rejects(
      load('services/api/client.ts').apiRequest('/auth/otp/request', { body: { phone: '9876543210' } }),
      /local development backend/,
    );
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
    if (originalDev === undefined) delete global.__DEV__;
    else global.__DEV__ = originalDev;
  }
});

test('only a confirmed HTTP 401 is classified as a session failure', () => {
  const { classifySessionFailure, createApiError } = load('services/api/api-error.ts');
  assert.deepEqual(classifySessionFailure(createApiError('Offline', { kind: 'network' })), {
    requiresLogin: false, reason: 'refresh_network_error', kind: 'network',
  });
  assert.deepEqual(classifySessionFailure(createApiError('Timed out', { kind: 'timeout' })), {
    requiresLogin: false, reason: 'refresh_timeout', kind: 'timeout',
  });
  assert.deepEqual(classifySessionFailure(createApiError('Unavailable', { kind: 'server', status: 503 })), {
    requiresLogin: false, reason: 'refresh_server_error', kind: 'server',
  });
  assert.deepEqual(classifySessionFailure(createApiError('Invalid', { kind: 'unauthorized', status: 401, code: 'REFRESH_INVALID' })), {
    requiresLogin: true, reason: 'refresh_invalid',
  });
  assert.deepEqual(classifySessionFailure(createApiError('Expired', { kind: 'unauthorized', status: 401, code: 'REFRESH_EXPIRED' })), {
    requiresLogin: true, reason: 'refresh_expired',
  });
  assert.deepEqual(classifySessionFailure(createApiError('Revoked', { kind: 'unauthorized', status: 401, code: 'SESSION_REVOKED' })), {
    requiresLogin: true, reason: 'refresh_revoked',
  });
});

test('parallel protected 401s share one refresh and retry each request only once', async () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = global.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://api.zippcart.in/api/v1';
  let refreshed = false;
  let refreshCalls = 0;
  const requests = new Map();
  try {
    const client = load('services/api/client.ts');
    let invalidSessions = 0;
    const recoverableFailures = [];
    client.registerAuthSessionHandler({
      hasSession: () => true,
      refresh: async () => {
        refreshCalls++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        refreshed = true;
      },
      onInvalidSession: () => { invalidSessions++; },
      onRecoverableRefreshFailure: (kind) => recoverableFailures.push(kind),
    });
    global.fetch = async (url) => {
      const path = new URL(url).pathname;
      requests.set(path, (requests.get(path) ?? 0) + 1);
      if (path === '/api/v1/private/a' || path === '/api/v1/private/b' || path === '/api/v1/private/c') {
        if (!refreshed) return {
          ok: false, status: 401, headers: new Headers(),
          json: async () => ({ message: 'Access token expired', code: 'ACCESS_TOKEN_INVALID' }),
        };
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      assert.fail(`Unexpected request: ${path}`);
    };
    const results = await Promise.all(['a', 'b', 'c'].map((id) => client.apiRequest(`/private/${id}`)));
    assert.deepEqual(results, [{ ok: true }, { ok: true }, { ok: true }]);
    assert.equal(refreshCalls, 1);
    assert.deepEqual([...requests.values()], [2, 2, 2]);
    assert.equal(invalidSessions, 0);
    assert.deepEqual(recoverableFailures, []);
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
});

test('refresh network failure preserves the session and OTP 401 never starts a refresh', async () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = global.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://api.zippcart.in/api/v1';
  try {
    const client = load('services/api/client.ts');
    let refreshCalls = 0;
    let invalidSessions = 0;
    const recoverableFailures = [];
    client.registerAuthSessionHandler({
      hasSession: () => true,
      refresh: async () => {
        refreshCalls++;
        const { createApiError } = load('services/api/api-error.ts');
        throw createApiError('Offline', { kind: 'network' });
      },
      onInvalidSession: () => { invalidSessions++; },
      onRecoverableRefreshFailure: (kind) => recoverableFailures.push(kind),
    });
    global.fetch = async () => ({
      ok: false, status: 401, headers: new Headers(),
      json: async () => ({ message: 'Unauthorized', code: 'ACCESS_TOKEN_INVALID' }),
    });
    await assert.rejects(client.apiRequest('/private/data'), (error) => error.status === 401);
    await assert.rejects(client.apiRequest('/auth/otp/verify'), (error) => error.status === 401);
    assert.equal(refreshCalls, 1);
    assert.equal(invalidSessions, 0);
    assert.deepEqual(recoverableFailures, ['network']);
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
});

test('an invalid refresh token clears auth once and does not retry indefinitely', async () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = global.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://api.zippcart.in/api/v1';
  try {
    const client = load('services/api/client.ts');
    let refreshCalls = 0;
    let requestCalls = 0;
    let invalidSessions = 0;
    client.registerAuthSessionHandler({
      hasSession: () => true,
      refresh: async () => {
        refreshCalls++;
        const { createApiError } = load('services/api/api-error.ts');
        throw createApiError('Session expired', { kind: 'unauthorized', status: 401, code: 'REFRESH_INVALID' });
      },
      onInvalidSession: () => { invalidSessions++; },
      onRecoverableRefreshFailure: () => assert.fail('Invalid refresh credentials are not recoverable'),
    });
    global.fetch = async () => {
      requestCalls++;
      return { ok: false, status: 401, headers: new Headers(), json: async () => ({ message: 'Expired access token' }) };
    };
    await assert.rejects(client.apiRequest('/private/data'), (error) => error.status === 401);
    assert.equal(refreshCalls, 1);
    assert.equal(requestCalls, 1);
    assert.equal(invalidSessions, 1);
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
});

test('a successful refresh is followed by at most one request retry', async () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = global.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://api.zippcart.in/api/v1';
  try {
    const client = load('services/api/client.ts');
    let refreshCalls = 0;
    let requestCalls = 0;
    client.registerAuthSessionHandler({
      hasSession: () => true,
      refresh: async () => { refreshCalls++; },
      onInvalidSession: () => assert.fail('A second request 401 must not loop or logout'),
      onRecoverableRefreshFailure: () => assert.fail('Refresh unexpectedly failed'),
    });
    global.fetch = async () => {
      requestCalls++;
      return { ok: false, status: 401, headers: new Headers(), json: async () => ({ message: 'Still unauthorized' }) };
    };
    await assert.rejects(client.apiRequest('/private/data'), (error) => error.status === 401);
    assert.equal(refreshCalls, 1);
    assert.equal(requestCalls, 2);
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
});
