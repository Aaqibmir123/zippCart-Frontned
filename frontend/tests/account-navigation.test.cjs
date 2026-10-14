const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceLoader } = require('./helpers/load-source.cjs');
const { hookHarness } = require('./helpers/hook-harness.cjs');
const theme = { useAppTheme: () => ({ colors: {}, isDark: false }) };
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}

test('Account route hides its drawer after navigation and keeps Home/Favorites destinations intact', () => {
  let focused = true; const calls = [];
  const { AccountScreen } = sourceLoader({
    '@react-navigation/native': { useIsFocused: () => focused, useNavigation: () => ({ navigate: (...args) => calls.push(args) }) },
    '../../components/ProfileDrawer': { ProfileDrawer: 'Drawer' },
  })('features/account/AccountScreen.tsx');
  assert.equal(AccountScreen().props.visible, true);
  AccountScreen().props.onOpenFavorites(); focused = false;
  assert.equal(AccountScreen().props.visible, false);
  assert.deepEqual(calls[0], ['ShopTabs', { screen: 'Favorites' }]);
  focused = true; AccountScreen().props.onClose();
  assert.deepEqual(calls[1], ['ShopTabs', { screen: 'Home' }]);
});

test('tab drawer respects cancelled navigation, closes on route changes/blur, and never duplicates Account route', () => {
  const h = hookHarness(); let focused = true, cancel = false; const dispatched = [];
  const { ShopTabBar } = sourceLoader({ react: h.react,
    '@react-navigation/native': { useIsFocused: () => focused, TabActions: { jumpTo: (name) => name } },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Button', StyleSheet: { create: (s) => s } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0 }) },
    '../ProfileDrawer': { ProfileDrawer: 'Drawer' }, '../../features/home/HomeIcon': { HomeIcon: 'Icon' },
    '../../theme/ThemeProvider': theme,
  })('components/shop/ShopTabBar.tsx');
  const state = { index: 0, routes: ['Home', 'Orders', 'Favorites', 'Account'].map((name) => ({ name, key: name })) };
  const props = { state, navigation: { emit: () => ({ defaultPrevented: cancel }), dispatch: (value) => dispatched.push(value) } };
  const render = () => h.render(() => ShopTabBar(props));
  const drawer = () => nodes(render()).find((node) => node.type === 'Drawer');
  const account = () => nodes(render()).find((node) => node.props?.accessibilityLabel === 'Account');
  cancel = true; account().props.onPress(); assert.equal(drawer().props.visible, false);
  cancel = false; account().props.onPress(); assert.equal(drawer().props.visible, true);
  drawer().props.onClose(); assert.equal(state.index, 0, 'closing overlay preserves the underlying tab');
  account().props.onPress(); drawer().props.onOpenFavorites();
  assert.equal(drawer().props.visible, false); assert.deepEqual(dispatched, ['Favorites']);
  account().props.onPress(); state.index = 1; render(); assert.equal(drawer().props.visible, false);
  account().props.onPress(); focused = false; assert.equal(drawer().props.visible, false);
  focused = true; render(); assert.equal(drawer().props.visible, false, 'returning must not reopen the old overlay');
  state.index = 3; render(); account().props.onPress(); assert.equal(drawer().props.visible, false);
  assert.equal(account().props.accessibilityState.selected, true);
  h.unmount();
});

function drawerFixture() {
  const h = hookHarness(); let focused = true, generation = 1; let closes = 0; const alerts = [];
  const loaded = sourceLoader({ react: h.react,
    '@react-navigation/native': { useIsFocused: () => focused },
    'react-native': { Alert: { alert: (...args) => alerts.push(args) }, KeyboardAvoidingView: 'Avoid', Modal: 'Modal',
      Platform: { OS: 'android' }, Pressable: 'Button', ScrollView: 'Scroll', Switch: 'Switch', Text: 'Text', View: 'View',
      StyleSheet: { create: (s) => s } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeArea' },
    './AppLoader': { AppLoader: 'Loader' }, './account/DeleteAccountDialog': { DeleteAccountDialog: 'Delete' },
    '../context/AuthContext': { useAuth: () => ({ user: { id: 'buyer', roles: ['admin'] }, session: { generation }, setUser() {} }) },
    '../services/auth/auth-mutations': { useLogout: () => ({}) }, '../services/auth/session-storage': {},
    './account/AccountDrawerHeader': { AccountDrawerHeader: 'Header' }, './account/AccountMenuRow': { AccountMenuRow: 'Menu' },
    './account/AccountPanel': { AccountPanel: 'Panel' }, './account/AccountModeSwitch': { AccountModeSwitch: 'Mode' },
    '../features/user/store-registration': { StoreRegistrationScreen: 'Store' },
    '../features/admin/stores': { AdminStoresScreen: 'Requests' },
    '../features/returns/ReturnSupportHub': { ReturnSupportHub: 'Support' },
    '../features/returns/return-api': { useReturnInbox: () => ({}) }, '../theme/ThemeProvider': theme,
  })('components/ProfileDrawer.tsx');
  const props = { visible: true, onClose: () => closes++, onOpenFavorites() {} };
  return { ...h, props, alerts, closes: () => closes,
    focus: (value) => { focused = value; }, login: () => generation++,
    wrapper: () => loaded.ProfileDrawer(props),
    content: () => h.render(() => loaded.ProfileDrawerContent(props)) };
}

test('drawer content is unmounted when hidden/blurred and recreated for a new login', () => {
  const h = drawerFixture(); const first = h.wrapper();
  h.props.visible = false; assert.equal(h.wrapper(), null);
  h.props.visible = true; h.focus(false); assert.equal(h.wrapper(), null);
  h.focus(true); assert.equal(h.wrapper().key, first.key);
  h.login(); assert.notEqual(h.wrapper().key, first.key);
});

test('drawer hardware Back delegates to nested Support/store/request pages before returning to menu', () => {
  const h = drawerFixture(); h.content();
  for (const [label, type] of [['Support', 'Support'], ['Your store', 'Store'], ['Store requests', 'Requests']]) {
    nodes(h.content()).find((node) => node.type === 'Menu' && node.props.label === label).props.onPress();
    const page = nodes(h.content()).find((node) => node.type === type); let backs = 0;
    page.props.onBackChange(() => backs++);
    nodes(h.content()).find((node) => node.type === 'Modal').props.onRequestClose();
    assert.equal(backs, 1); assert.equal(h.closes(), 0);
    page.props.onBackChange(null); page.props.onClose(); h.content();
  }
  nodes(h.content()).find((node) => node.type === 'Modal').props.onRequestClose();
  assert.equal(h.closes(), 1); assert.equal(h.alerts.length, 0);
  h.unmount();
});

test('registration modal Back goes one step back, blocks while busy, and confirms leaving unsaved details', () => {
  const h = hookHarness(); const alerts = []; let modalBack, hardwareBack; let backs = 0, closes = 0;
  const state = { step: 2, busy: false, registeredPhone: '', form: { mobile: '' }, errors: {}, back: () => backs++ };
  const { StoreRegistrationScreen } = sourceLoader({ react: h.react,
    '../../../components/AppLoader': { AppLoader: 'Loader' },
    'react-native': { AccessibilityInfo: {}, Alert: { alert: (...args) => alerts.push(args) },
      BackHandler: { addEventListener: (_event, handler) => { hardwareBack = handler; return { remove() {} }; } },
      Keyboard: { dismiss() {} }, Platform: { OS: 'android' }, KeyboardAvoidingView: 'Avoid', Pressable: 'Button', ScrollView: 'Scroll', Text: 'Text', View: 'View' },
    'expo-linear-gradient': { LinearGradient: 'Gradient' },
    './RegistrationSteps': { AddressStep: 'Step', DocumentsStep: 'Step', PayoutStep: 'Step', StoreDetailsStep: 'Step' },
    './registration.styles': { palette: {}, s: {} }, './registration-model': { steps: Array.from({ length: 4 }, () => ({ label: 'Step' })) },
    './StoreIcon': { StoreIcon: 'Icon' }, './useStoreRegistration': { useStoreRegistration: () => state },
    './SellerPhoneVerification': { SellerPhoneVerification: 'OTP' },
  })('features/user/store-registration/StoreRegistrationScreen.tsx');
  const render = () => h.render(() => StoreRegistrationScreen({ onClose: () => closes++, onBackChange: (handler) => { modalBack = handler; } }));
  render(); modalBack(); assert.equal(backs, 1); assert.equal(alerts.length, 0);
  state.busy = true; render(); modalBack(); assert.equal(backs, 1);
  state.busy = false; state.step = 0; render(); hardwareBack(); assert.equal(alerts.length, 1);
  assert.equal(closes, 0); alerts[0][2].find((action) => action.text === 'Leave').onPress(); assert.equal(closes, 1);
  state.registeredPhone = '9876543210'; render(); modalBack(); assert.equal(closes, 2); assert.equal(alerts.length, 1);
  h.unmount(); assert.equal(modalBack, null);
});

test('store entry forwards child back actions and closes saved-store overview without discard prompts', () => {
  const h = hookHarness(); let handler; let closes = 0;
  const query = { isSuccess: true, data: { store: null } };
  const { StoreRegistrationEntry } = sourceLoader({ react: h.react,
    '../../../components/AppLoader': { AppLoader: 'Loader' }, '@tanstack/react-query': { useQuery: () => query },
    'react-native': { Pressable: 'Button', ScrollView: 'Scroll', Text: 'Text', View: 'View' },
    '../../../context/AuthContext': { useAuth: () => ({ user: { id: 'buyer' } }) },
    './store-api': { storeApi: {}, storeQueryKey: () => [] }, './StoreRegistrationScreen': { StoreRegistrationScreen: 'Registration' },
    './StoreIcon': { StoreIcon: 'Icon' }, './registration.styles': { palette: {}, s: {} },
  })('features/user/store-registration/StoreRegistrationEntry.tsx');
  const render = () => h.render(() => StoreRegistrationEntry({ onClose: () => closes++, onBackChange: (value) => { handler = value; } }));
  const form = render(); let childBack = 0; form.props.onBackChange(() => childBack++);
  handler(); assert.equal(childBack, 1); assert.equal(closes, 0);
  form.props.onBackChange(null); query.data.store = { id: 'store', status: 'pending' }; render();
  handler(); assert.equal(closes, 1); h.unmount(); assert.equal(handler, null);
});
