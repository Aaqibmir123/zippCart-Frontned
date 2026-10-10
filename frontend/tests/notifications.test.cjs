const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function setup({ status = 'granted', expoGo = false, failure = false } = {}) {
  const calls = []; let handler;
  const notifications = {
    AndroidImportance: { DEFAULT: 3 },
    setNotificationHandler: (value) => { handler = value; },
    setNotificationChannelAsync: async () => calls.push('channel'),
    getPermissionsAsync: async () => ({ status, canAskAgain: true }),
    requestPermissionsAsync: async () => { calls.push('permission'); return { status: 'granted' }; },
    getExpoPushTokenAsync: async ({ projectId }) => {
      assert.equal(projectId, 'project'); calls.push('token');
      if (failure) throw new Error('private provider detail');
      return { data: 'ExponentPushToken[valid-token]' };
    },
  };
  const filename = path.resolve(__dirname, '../services/notifications/push-notifications.ts');
  const target = new Module(filename);
  target.require = (id) => {
    if (id === 'expo-constants') return { __esModule: true, default: { appOwnership: expoGo ? 'expo' : null, easConfig: { projectId: 'project' } } };
    if (id === 'react-native') return { Platform: { OS: 'android' } };
    if (id === 'expo-device') return { isDevice: true };
    if (id === 'expo-notifications') return notifications;
    throw new Error(id);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return { ...target.exports, calls, handler: () => handler };
}

test('native registration creates channel before permission and obtains the EAS project token', async () => {
  const app = setup({ status: 'undetermined' });
  assert.equal(await app.registerForPushNotificationsAsync(), 'ExponentPushToken[valid-token]');
  assert.deepEqual(app.calls, ['channel', 'permission', 'token']);
});
test('denied permissions are respected without repeated OS prompts and Expo Go skips native setup', async () => {
  const denied = setup({ status: 'denied' });
  assert.equal(await denied.registerForPushNotificationsAsync(), null);
  assert.deepEqual(denied.calls, ['channel']);
  const go = setup({ expoGo: true });
  assert.equal(await go.registerForPushNotificationsAsync(), null);
  assert.deepEqual(go.calls, []);
});
test('registration errors are retryable and do not expose provider details', async () => {
  await assert.rejects(setup({ failure: true }).registerForPushNotificationsAsync(), { message: 'Could not enable notifications. Please try again.' });
});
test('foreground presentation follows current account and stops after logout', async () => {
  const app = setup(); let active = true;
  await app.registerForPushNotificationsAsync((id) => active && id === 'buyer');
  const notification = (recipientId) => ({ request: { content: { data: { recipientId } } } });
  assert.equal((await app.handler().handleNotification(notification('buyer'))).shouldShowBanner, true);
  assert.equal((await app.handler().handleNotification(notification('other'))).shouldShowBanner, false);
  active = false;
  assert.equal((await app.handler().handleNotification(notification('buyer'))).shouldShowBanner, false);
});
