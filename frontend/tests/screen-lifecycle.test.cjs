const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceLoader } = require('./helpers/load-source.cjs');
const { hookHarness, fakeClock } = require('./helpers/hook-harness.cjs');

test('visibility follows app state and navigation focus with safe standalone fallback and listener cleanup', () => {
  let focused = true; const events = new Map(); const appListeners = new Set();
  const context = { value: { isFocused: () => focused, addListener: (event, fn) => {
    const listeners = events.get(event) ?? new Set(); events.set(event, listeners); listeners.add(fn);
    return () => listeners.delete(fn);
  } } };
  const AppState = { currentState: 'active', addEventListener: (_event, fn) => {
    appListeners.add(fn); return { remove: () => appListeners.delete(fn) };
  } };
  const h = hookHarness(); const second = hookHarness(); let current = h;
  const react = Object.fromEntries(Object.keys(h.react).map((key) => [key, (...args) => current.react[key](...args)]));
  const { useScreenActive } = sourceLoader({ react, 'react-native': { AppState }, '@react-navigation/native': { NavigationContext: context } })('hooks/useScreenActive.ts');
  const render = (enabled = true) => { current = h; return h.render(() => useScreenActive(enabled)); };
  assert.equal(render(), true);
  current = second; assert.equal(second.render(() => useScreenActive()), true);
  assert.equal(appListeners.size, 1, 'share one app-state listener across components');
  focused = false; events.get('blur').forEach((fn) => fn()); assert.equal(render(), false);
  focused = true; AppState.currentState = 'background'; appListeners.forEach((fn) => fn()); assert.equal(render(), false);
  AppState.currentState = 'inactive'; assert.equal(render(), false);
  AppState.currentState = 'active'; assert.equal(render(), true);
  assert.equal(render(false), false, 'hidden embedded tabs can explicitly disable work');
  context.value = undefined; assert.equal(render(), true, 'startup/seller/admin can render without a stack navigator');
  h.unmount(); assert.equal(appListeners.size, 1);
  second.unmount(); assert.equal(appListeners.size, 0);
  assert.equal([...events.values()].reduce((sum, listeners) => sum + listeners.size, 0), 0);
});

test('countdown cancels hidden ticks, catches up on resume, stops at zero and cleans up after resend', (t) => {
  const clock = fakeClock(t); const h = hookHarness(); let active = true;
  const { useCountdown } = sourceLoader({ react: h.react,
    './useScreenActive': { useScreenActive: (enabled = true) => active && enabled },
  })('hooks/useCountdown.ts');
  let deadline = clock.now() + 5000;
  const render = (enabled = true) => h.render(() => useCountdown(deadline, enabled));
  assert.equal(render(), 5); assert.equal(clock.timers.size, 1);
  clock.advance(1000); assert.equal(render(), 4);
  active = false; render(); assert.equal(clock.timers.size, 0);
  clock.advance(3000); active = true; render(); assert.equal(render(), 1);
  clock.advance(1000); assert.equal(render(), 0); assert.equal(clock.timers.size, 0);
  clock.advance(60000); assert.equal(clock.timers.size, 0);
  deadline = clock.now() + 45000; render(); assert.equal(render(), 45);
  render(false); assert.equal(clock.timers.size, 0, 'verified seller must stop OTP work');
  render(); assert.equal(clock.timers.size, 1);
  h.unmount(); assert.equal(clock.timers.size, 0);
});

test('expired OTP resumes immediately with no new timer', (t) => {
  const clock = fakeClock(t); const h = hookHarness(); let active = true;
  const { useCountdown } = sourceLoader({ react: h.react, './useScreenActive': { useScreenActive: () => active } })('hooks/useCountdown.ts');
  const deadline = clock.now() + 45000;
  const render = () => h.render(() => useCountdown(deadline));
  render(); active = false; render(); clock.advance(120000);
  active = true; render(); assert.equal(render(), 0); assert.equal(clock.timers.size, 0);
  h.unmount();
});

test('return-window timer only runs visibly and catches expired windows after backgrounding', (t) => {
  const clock = fakeClock(t); const h = hookHarness(); let active = true;
  const { useDeadlineClock } = sourceLoader({ react: h.react, './useScreenActive': { useScreenActive: () => active } })('hooks/useDeadlineClock.ts');
  let deadline = new Date(clock.now() + 86400000).toISOString();
  const render = () => h.render(() => useDeadlineClock(deadline));
  render(); assert.equal(clock.timers.size, 1);
  active = false; render(); assert.equal(clock.timers.size, 0);
  clock.advance(86400001); active = true; render();
  assert.ok(render() > new Date(deadline).getTime()); assert.equal(clock.timers.size, 0);
  deadline = new Date(clock.now() + 1000).toISOString(); render(); clock.advance(1001);
  assert.equal(render(), clock.now()); assert.equal(clock.timers.size, 0);
  h.unmount();
});

test('loader animation pauses on hidden screens, resumes visibly and respects reduced motion', async () => {
  let active = true, motion; let starts = 0, stops = 0;
  const h = hookHarness();
  const { AppLoader } = sourceLoader({ react: h.react,
    '../hooks/useScreenActive': { useScreenActive: () => active },
    'react-native': { View: 'View', Text: 'Text', Easing: {}, StyleSheet: { create: (styles) => styles },
      AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: (_event, fn) => { motion = fn; return { remove() {} }; } },
      Animated: { Value: class { interpolate() { return 0; } setValue() {} }, View: 'AnimatedView', timing() {},
        loop: () => ({ start: () => starts++, stop: () => stops++ }) } },
  })('components/AppLoader.tsx');
  const render = () => h.render(() => AppLoader({}));
  render(); await Promise.resolve(); render(); assert.equal(starts, 1);
  active = false; render(); assert.equal(stops, 1);
  active = true; render(); assert.equal(starts, 2);
  motion(true); render(); assert.equal(stops, 2); assert.equal(starts, 2);
  h.unmount();
});

test('feedback expiry is cancelled on blur and stale messages are cleared', (t) => {
  const clock = fakeClock(t); const h = hookHarness(); let active = true;
  const { useTimedFeedback } = sourceLoader({ react: h.react, './useScreenActive': { useScreenActive: () => active } })('hooks/useTimedFeedback.ts');
  const render = () => h.render(() => useTimedFeedback());
  render().showFeedback('Saved', 'success'); render(); assert.equal(clock.timers.size, 1);
  active = false; render(); assert.equal(clock.timers.size, 0); assert.equal(render().feedback, null);
  active = true; assert.equal(render().feedback, null); h.unmount();
});

test('customer, seller and admin polling options disable hidden screens and honor embedded-tab visibility', () => {
  let visible = true;
  const identity = (options) => options;
  const visibility = { useScreenActive: (enabled = true) => visible && enabled };
  const auth = { useAuth: () => ({ user: { id: 'buyer', roles: ['admin', 'seller'] }, session: { generation: 1 } }) };
  const load = sourceLoader({
    '@tanstack/react-query': { useQuery: identity, useInfiniteQuery: identity },
    '../../hooks/useScreenActive': visibility, '../../../hooks/useScreenActive': visibility,
    '../../context/AuthContext': auth, '../../../context/AuthContext': auth,
    '../../services/api/client': {}, '../../../services/api/client': {},
    './seller-order-api': { sellerOrderApi: {} }, '../api/order-api': { orderApi: {} }, '../cart/cart-queries': {},
  });
  const returns = load('features/returns/return-api.ts');
  const seller = load('features/seller/orders/useSellerOrders.ts');
  const admin = load('features/admin/dashboard/dashboard-api.ts');
  const earnings = load('features/earnings/earnings-api.ts');
  const orders = load('services/orders/order-queries.ts');
  const hooks = [() => returns.useReturnCases('order'), () => returns.useReturnInbox(), () => returns.useAdminReturnCases('all'),
    () => seller.useSellerOrders('seller'), () => admin.useAdminAnalytics(), () => earnings.useEarnings(false),
    () => orders.useOrders(), () => orders.useOrder('order')];
  for (const hook of hooks) { assert.equal(hook().enabled, true); assert.ok(hook().refetchInterval > 0); }
  visible = false;
  for (const hook of hooks) { assert.equal(hook().enabled, false); assert.equal(hook().refetchInterval, false); }
  visible = true;
  for (const result of [seller.useSellerOrders('seller', 'all', false), admin.useAdminAnalytics(7, false),
    returns.useReturnCases('order', false, false), returns.useReturnInbox('all', false), returns.useAdminReturnCases('all', false)]) {
    assert.equal(result.enabled, false); assert.equal(result.refetchInterval, false);
  }
});
