const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceLoader } = require('./helpers/load-source.cjs');
const { hookHarness } = require('./helpers/hook-harness.cjs');

test('a seller notification is consumed before switching mode and cannot repeat the API call on render', () => {
  const h = hookHarness(); let calls = 0;
  let target = { type: 'order-operations', orderId: 'order' };
  let user = { id: 'A', roles: ['seller'], isActive: true, storeStatus: 'approved', mode: 'customer' };
  const { usePushNotifications } = sourceLoader({ react: h.react,
    '../features/notifications/NotificationProvider': { useNotifications: () => ({ target, consume: () => { target = null; } }) },
    '../context/AuthContext': { useAuth: () => ({ user, setUser: (next) => { assert.equal(target, null); user = next; } }) },
    '../services/api/auth-api': { authApi: { switchMode: async () => { calls++; } } },
  })('hooks/usePushNotifications.ts');
  const navigation = {};
  h.render(() => usePushNotifications('A', navigation));
  h.render(() => usePushNotifications('A', navigation));
  assert.equal(calls, 1); assert.equal(user.mode, 'seller');
});

test('late seller-switch callbacks cannot replace a new account', () => {
  const h = hookHarness(); let mutation, writes = 0;
  let auth;
  const load = sourceLoader({ react: h.react,
    '../AppLoader': { AppLoader: 'Loader' },
    'react-native': { Pressable: 'Button', StyleSheet: { create: s => s }, Text: 'Text', View: 'View' },
    '@tanstack/react-query': { useQuery: () => ({}), useMutation: (options) => { mutation = options; return {}; } },
    '../../context/AuthContext': { useAuth: () => auth },
    '../../services/api/auth-api': { authApi: {} },
  });
  const scope = load('services/auth/session-scope.ts');
  auth = { user: { id: 'A' }, session: scope.setSessionUser('A'), setUser: () => writes++ };
  const { AccountModeSwitch } = load('components/account/AccountModeSwitch.tsx');
  h.render(AccountModeSwitch);
  scope.setSessionUser('B');
  mutation.onSuccess({ user: { id: 'A', mode: 'seller' } });
  assert.equal(writes, 0);
});
