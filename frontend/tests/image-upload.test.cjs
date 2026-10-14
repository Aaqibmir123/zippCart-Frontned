const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceLoader } = require('./helpers/load-source.cjs');

function setup(options = {}) {
  const counts = { base64: 0, released: 0, removed: 0, uploads: 0 };
  const asset = { uri: 'file:///original.jpg', width: 900, height: 1200, fileSize: 10000 };
  const file = { uri: 'file:///prepared.jpg', size: options.size ?? 1000,
    base64: async () => { counts.base64++; return '/9j/'; }, delete: () => { counts.removed++; } };
  const context = { resize() {}, release() { counts.released++; }, renderAsync: async () => {
    await options.onRender?.();
    return { release: () => { counts.released++; }, saveAsync: async value => {
      assert.equal(value.base64, undefined); return { uri: file.uri };
    } };
  } };
  const load = sourceLoader({
    'expo-image-manipulator': { ImageManipulator: { manipulate: () => context }, SaveFormat: { JPEG: 'jpeg' } },
    'expo-file-system': { File: function () { return file; } },
    'react-native': { TurboModuleRegistry: { get: () => null } },
  });
  const sessions = load('services/auth/session-scope.ts'); sessions.setSessionUser('A');
  return { counts, asset, file, sessions, helper: load('services/media/image-upload.ts'),
    apiError: load('services/api/api-error.ts').createApiError };
}

test('binary upload avoids Base64 and releases its temporary image', async () => {
  const f = setup();
  const result = await f.helper.uploadPreparedImage(f.asset, f.sessions.getSessionScope(), 1200,
    async file => { assert.equal(file, f.file); return 'url'; }, () => assert.fail('unexpected legacy fallback'));
  assert.equal(result, 'url'); assert.equal(f.counts.base64, 0);
  assert.equal(f.counts.released, 2); assert.equal(f.counts.removed, 1);
});
test('old backend and disabled upload flag fall back to the existing JPEG contract', async () => {
  for (const failure of [{ status: 404, kind: 'http' }, { status: 501, code: 'IMAGE_UPLOADS_DISABLED', kind: 'http' }]) {
    const f = setup();
    const result = await f.helper.uploadPreparedImage(f.asset, f.sessions.getSessionScope(), 512,
      async () => { throw f.apiError('Unavailable', failure); }, async data => data);
    assert.equal(result, 'data:image/jpeg;base64,/9j/'); assert.equal(f.counts.base64, 1);
  }
});
test('timeout and server failures never trigger a second upload via fallback', async () => {
  for (const failure of [{ kind: 'timeout' }, { kind: 'http', status: 502 }, { kind: 'http', status: 403 }]) {
    const f = setup();
    await assert.rejects(f.helper.uploadPreparedImage(f.asset, f.sessions.getSessionScope(), 1200,
      async () => { throw f.apiError('Failed', failure); }, () => assert.fail('unsafe fallback')));
    assert.equal(f.counts.base64, 0); assert.equal(f.counts.removed, 1);
  }
});
test('User A picker result cannot upload after switching to User B', async () => {
  const f = setup(); const session = f.sessions.getSessionScope(); f.sessions.setSessionUser('B');
  await assert.rejects(f.helper.uploadPreparedImage(f.asset, session, 1200,
    () => assert.fail('cross-session upload'), () => assert.fail('cross-session fallback')), { kind: 'cancelled' });
});
test('a session change during preparation or upload rejects the old image result', async () => {
  let f = setup({ onRender: () => { f.sessions.setSessionUser('B'); } });
  await assert.rejects(f.helper.uploadPreparedImage(f.asset, f.sessions.getSessionScope(), 1200,
    () => assert.fail('cross-session upload'), async data => data), { kind: 'cancelled' });
  f = setup();
  await assert.rejects(f.helper.uploadPreparedImage(f.asset, f.sessions.getSessionScope(), 1200,
    async () => { f.sessions.setSessionUser('B'); return 'A-image'; }, async data => data), { kind: 'cancelled' });
  assert.equal(f.counts.base64, 0);
});
test('oversized generated files never reach the upload transport', async () => {
  const f = setup({ size: 512001 });
  await assert.rejects(f.helper.uploadPreparedImage(f.asset, f.sessions.getSessionScope(), 1200,
    () => assert.fail('oversized upload'), async data => data), /too large/);
  assert.equal(f.counts.removed, 1);
});

test('binary transport keeps cookies, replays only after refresh, and aborts on account change', async t => {
  const previous = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test/api/v1';
  t.after(() => { if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previous; });
  const requests = []; let delayed, refreshes = 0;
  const load = sourceLoader({
    'react-native': { TurboModuleRegistry: { get: () => null } },
    'expo/fetch': { fetch: async (_url, options) => {
      requests.push(options);
      if (requests.length === 1) return { ok: false, status: 401, headers: new Headers(), json: async () => ({ message: 'Expired' }) };
      if (requests.length === 3) return new Promise(resolve => { delayed = resolve; });
      return { ok: true, status: 201, json: async () => ({ url: 'A-image' }) };
    } },
  });
  const sessions = load('services/auth/session-scope.ts'); sessions.setSessionUser('A');
  const client = load('services/api/client.ts');
  client.registerAuthSessionHandler({ hasSession: () => true, refresh: async () => { refreshes++; },
    onInvalidSession: () => assert.fail('unexpected logout'), onRecoverableRefreshFailure() {} });
  const imageBody = new Blob(['image'], { type: 'image/jpeg' });
  await client.apiRequest('/media/profile', { imageBody });
  assert.equal(refreshes, 1); assert.equal(requests.length, 2);
  for (const options of requests) {
    assert.equal(options.body, imageBody); assert.equal(options.credentials, 'include');
    assert.equal(options.headers['Content-Type'], 'image/jpeg');
  }
  const pending = client.apiRequest('/media/profile', { imageBody }).catch(error => error);
  await new Promise(setImmediate); sessions.setSessionUser('B');
  assert.equal(requests[2].signal.aborted, true);
  delayed({ ok: true, status: 201, json: async () => ({ url: 'A-late-image' }) });
  assert.equal((await pending).kind, 'cancelled');
});
