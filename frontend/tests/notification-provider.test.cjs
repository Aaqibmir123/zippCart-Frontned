const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const tick = () => new Promise(setImmediate);

function mount({ registerDevice = async () => {}, token = 'ExponentPushToken[test]', lastFails = false } = {}) {
  const user = { id: 'a'.repeat(24) };
  const slots = [], cleanups = [], subscriptions = {}, calls = [];
  let cursor = 0;
  const react = {
    createContext: () => ({ Provider: 'Context' }),
    useRef: (initial) => slots[cursor++] ??= { current: initial },
    useCallback: (fn) => fn,
    useState: (initial) => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], (value) => { slots[i] = value; }];
    },
    useEffect: (fn) => {
      const i = cursor++;
      if (!slots[i]) { slots[i] = true; cleanups.push(fn()); }
    },
  };
  const notifications = {
    addNotificationResponseReceivedListener: (cb) => { subscriptions.response = cb; return { remove() {} }; },
    addNotificationReceivedListener: (cb) => { subscriptions.receive = cb; return { remove() {} }; },
    addPushTokenListener: () => ({ remove() {} }),
    getLastNotificationResponseAsync: async () => { if (lastFails) throw new Error('native history failed'); return null; },
    clearLastNotificationResponseAsync: async () => {},
  };
  const client = { invalidateQueries: async ({ queryKey }) => calls.push(['invalidate', queryKey[0]]) };
  const filename = path.resolve(__dirname, '../features/notifications/NotificationProvider.tsx');
  const target = new Module(filename);
  target.require = (name) => {
    if (name === 'react') return react;
    if (name === 'react-native') return { Platform: { OS: 'android' }, AppState: { addEventListener: () => ({ remove() {} }) } };
    if (name === '@tanstack/react-query') return { useQueryClient: () => client };
    if (name.endsWith('/AuthContext')) return { useAuth: () => ({ user }) };
    if (name.endsWith('/push-notifications')) return { isExpoGo: () => false, registerForPushNotificationsAsync: async () => { calls.push(['native']); return token; } };
    if (name.endsWith('/notification-api')) return { notificationApi: { registerDevice: async (...args) => { calls.push(['backend']); await registerDevice(...args); } } };
    if (name.endsWith('/api-error')) return { isApiError: (error) => !!error.isApiError };
    if (name === 'expo-notifications') return notifications;
    return require(name);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  const render = () => { cursor = 0; return target.exports.NotificationProvider({ children: null }).props.value; };
  render();
  return { render, calls, subscriptions, unmount: () => cleanups.forEach((fn) => fn?.()) };
}

test('startup registers automatically even when reading the last notification fails', async () => {
  const app = mount({ lastFails: true });
  await tick();
  assert.equal(app.render().status, 'enabled');
  assert.deepEqual(app.calls, [['native'], ['backend']]);
  app.unmount();
});

test('transient registration failure retries automatically and stops after logout', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let attempt = 0;
  const app = mount({ registerDevice: async () => { if (++attempt === 1) throw new Error('offline'); } });
  await tick();
  assert.equal(app.render().status, 'error');
  t.mock.timers.tick(5000);
  await tick();
  assert.equal(app.render().status, 'enabled');
  assert.equal(attempt, 2);
  app.unmount();
  t.mock.timers.tick(120000);
  assert.equal(attempt, 2);
  const cancelled = mount({ registerDevice: async () => { throw new Error('offline'); } });
  await tick();
  cancelled.unmount();
  t.mock.timers.tick(120000);
  await tick();
  assert.equal(cancelled.calls.filter(([name]) => name === 'backend').length, 1);
});

test('denial and a missing backend route do not trigger a retry loop', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const denied = mount({ token: null });
  const missing = mount({ registerDevice: async () => { throw Object.assign(new Error('Not found'), { isApiError: true, status: 404 }); } });
  await tick();
  t.mock.timers.tick(120000);
  await tick();
  assert.equal(denied.render().status, 'denied');
  assert.deepEqual(denied.calls, [['native']]);
  assert.deepEqual(missing.calls, [['native'], ['backend']]);
  denied.unmount(); missing.unmount();
});

test('notification events are account scoped and refresh the inbox', async () => {
  const app = mount();
  await tick();
  const response = (recipientId) => ({ notification: { request: { content: { data: {
    type: 'order-status', orderId: 'b'.repeat(24), recipientId,
  } } } } });
  app.subscriptions.response(response('other-user'));
  assert.equal(app.render().target, null);
  app.subscriptions.response(response('a'.repeat(24)));
  assert.equal(app.render().target.orderId, 'b'.repeat(24));
  assert.ok(app.calls.some(([name, key]) => name === 'invalidate' && key === 'notification-inbox'));
  app.unmount();
});
