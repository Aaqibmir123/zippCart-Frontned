const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const tick = () => new Promise(setImmediate);
const { fakeClock } = require('./helpers/hook-harness.cjs');

function mount({ registerDevice = async () => {}, token = 'ExponentPushToken[test]', lastFails = false } = {}) {
  const user = { id: 'a'.repeat(24) };
  const sessionController = new AbortController();
  const session = { signal: sessionController.signal };
  let canShow;
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
    dismissAllNotificationsAsync: async () => { calls.push(['dismiss']); },
  };
  const client = { invalidateQueries: async ({ queryKey }) => calls.push(['invalidate', queryKey[0]]) };
  const filename = path.resolve(__dirname, '../features/notifications/NotificationProvider.tsx');
  const target = new Module(filename);
  target.require = (name) => {
    if (name === 'react') return react;
    if (name === 'react-native') return { Platform: { OS: 'android' }, AppState: {
      addEventListener: (_event, listener) => { subscriptions.foreground = listener; return { remove() {} }; },
    } };
    if (name === '@tanstack/react-query') return { useQueryClient: () => client };
    if (name.endsWith('/AuthContext')) return { useAuth: () => ({ user, session }) };
    if (name.endsWith('/push-notifications')) return { isExpoGo: () => false, registerForPushNotificationsAsync: async (handler) => { canShow = handler; calls.push(['native']); return token; } };
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
  return { render, calls, subscriptions, endSession: () => sessionController.abort(),
    canShow: (id) => canShow(id), unmount: () => cleanups.forEach((fn) => fn?.()) };
}

test('unchanged tokens re-register on foreground after five minutes with no rapid duplicate API calls', async t => {
  const clock = fakeClock(t);
  const app = mount(); await tick();
  const registrations = () => app.calls.filter(([event]) => event === 'backend').length;
  assert.equal(registrations(), 1);
  clock.advance(60000); app.subscriptions.foreground('active'); await tick();
  assert.equal(registrations(), 1);
  clock.advance(240000); app.subscriptions.foreground('active'); await tick();
  assert.equal(registrations(), 2);
  for (let i = 0; i < 10; i++) app.subscriptions.foreground('active');
  await tick(); assert.equal(registrations(), 2);
  app.endSession(); clock.advance(300000); app.subscriptions.foreground('active'); await tick();
  assert.equal(registrations(), 2);
  app.unmount();
});

test('failed renewal remains retryable and a new login never inherits the previous registration cache', async t => {
  const clock = fakeClock(t); let registrations = 0;
  const app = mount({ registerDevice: async () => { if (++registrations === 2) throw new Error('offline'); } });
  await tick(); clock.advance(300000); app.subscriptions.foreground('active'); await tick();
  assert.equal(app.render().status, 'error');
  clock.advance(5000); await tick(); assert.equal(registrations, 3);
  app.unmount();
  const next = mount({ registerDevice: async () => { registrations++; } }); await tick();
  assert.equal(registrations, 4);
  next.unmount();
});

test('logout immediately suppresses old notifications and dismisses delivered notifications before React cleanup', async () => {
  const app = mount(); await tick();
  const recipientId = 'a'.repeat(24);
  assert.equal(app.canShow(recipientId), true);
  app.endSession();
  assert.equal(app.canShow(recipientId), false);
  assert.ok(app.calls.some(([event]) => event === 'dismiss'));
  app.subscriptions.receive({ request: { content: { data: { recipientId } } } });
  assert.equal(app.calls.filter(([event]) => event === 'invalidate').length, 0);
  app.unmount();
});

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
