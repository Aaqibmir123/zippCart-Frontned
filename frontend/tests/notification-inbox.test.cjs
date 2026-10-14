const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, mocks) {
  const filename = path.resolve(__dirname, '..', file);
  const target = new Module(filename);
  target.require = (name) => name.endsWith('/ThemeProvider')
    ? { useAppTheme: () => ({ isDark: false, colors: { background: '#fff', surface: '#fff', border: '#eee', text: '#000', muted: '#777', raised: '#f5f5f5', primary: '#7139F5' } }) }
    : Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  return target.exports;
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
const native = { View: 'View', Text: 'Text', Pressable: 'Pressable', FlatList: 'FlatList', StyleSheet: { create: (s) => s } };

test('home bell invokes notification navigation, not the orders shortcut', () => {
  let opened = 0;
  const { HomeHero } = load('features/home/HomeHero.tsx', {
    'react-native': native, 'expo-linear-gradient': { LinearGradient: 'Gradient' },
    '../../context/AuthContext': { useAuth: () => ({ user: {} }) },
    '../../components/account/ProfileAvatar': { ProfileAvatar: 'Avatar' },
    '../../components/brand/BrandWordmark': { BrandWordmark: 'BrandWordmark' },
    '../../services/cart/cart-queries': { useCart: () => ({}) }, './HomeIcon': { HomeIcon: 'Icon' },
    './HomeBanner': { HomeBanner: 'Banner' }, './home.styles': { h: {}, palette: {} }, '../../assets/home/shopping-hero.png': 1,
  });
  const tree = HomeHero({ onNotifications: () => opened++ });
  nodes(tree).find((node) => node.props?.accessibilityLabel === 'View notifications').props.onPress();
  assert.equal(opened, 1);
});

test('inbox shows actual updates and opens the selected order detail', () => {
  const calls = [];
  const item = { id: 'event', orderId: 'a'.repeat(24), title: 'Order confirmed', body: 'Confirmed', createdAt: new Date().toISOString() };
  const { NotificationsScreen } = load('features/notifications/NotificationsScreen.tsx', {
    'react-native': native, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@react-navigation/native': { useNavigation: () => ({ navigate: (...args) => calls.push(args), goBack() {} }) },
    '../../components/AppLoader': { AppLoader: 'Loader' },
    './notification-inbox': { useNotificationInbox: () => ({ data: { pages: [{ notifications: [item] }] } }) },
  });
  const list = nodes(NotificationsScreen()).find((node) => node.type === 'FlatList');
  assert.deepEqual(list.props.data, [item]);
  list.props.renderItem({ item }).props.onPress();
  assert.deepEqual(calls, [['OrderDetails', { orderId: item.orderId }]]);
});

test('dashboard distinguishes expired session, missing service and temporary failure', () => {
  const { dashboardError } = load('features/admin/dashboard/dashboard-error.ts', {
    '../../../services/api/api-error': { isApiError: (error) => error.isApiError },
  });
  assert.match(dashboardError({ isApiError: true, status: 401 }), /session has expired/);
  assert.match(dashboardError({ isApiError: true, status: 404 }), /service is unavailable/);
  assert.match(dashboardError(new Error('database details')), /Please try again/);
});
