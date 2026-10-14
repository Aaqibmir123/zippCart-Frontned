const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceLoader } = require('./helpers/load-source.cjs');

for (const offline of [false, true]) {
  test(`logout clears local identity before network completes and retains pending state offline (${offline})`, async () => {
    const calls = []; let finish;
    const remote = new Promise((resolve, reject) => { finish = () => offline ? reject(new Error('offline')) : resolve(); });
    const { logoutSession } = sourceLoader({
      '../api/auth-api': { authApi: { logout: () => { calls.push('server'); return remote; } } },
      './session-storage': { setPendingLogout: async () => calls.push('pending'), clearPendingLogout: async () => calls.push('cleared') },
    })('services/auth/logout-session.ts');
    const first = logoutSession(() => calls.push('local'));
    const second = logoutSession(() => assert.fail('Duplicate local clear'));
    assert.equal(first, second);
    const result = first.catch((error) => error);
    await new Promise(setImmediate);
    assert.deepEqual(calls, ['pending', 'local', 'server']);
    finish(); await result;
    assert.deepEqual(calls, offline ? ['pending', 'local', 'server'] : ['pending', 'local', 'server', 'cleared']);
  });
}
