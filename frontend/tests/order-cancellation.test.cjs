const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(relative, mocks) {
  const filename = path.resolve(__dirname, '..', relative);
  const target = new Module(filename);
  target.require = (id) => id.endsWith('/AppLoader') ? { AppLoader: 'ActivityIndicator' }
    : id.endsWith('/ThemeProvider') ? { useAppTheme: () => ({ isDark: false, colors: { background: '#fff', surface: '#fff', border: '#eee', text: '#000', muted: '#777', raised: '#f5f5f5', primary: '#7139F5' } }) }
      : id in mocks ? mocks[id] : require(id);
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return target.exports;
}
function nodes(value) {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object') return [];
  return [value, ...[value.props?.children].flat().flatMap(nodes)];
}
function screen(order) {
  const state = []; let cursor = 0; const requests = []; const confirmations = [];
  const mutation = { isPending: false, mutateAsync: async (input) => requests.push(input) };
  const { CustomerOrderActions } = load('features/orders/CustomerOrderActions.tsx', {
    react: { useRef: (value) => ({ current: value }), useState: (initial) => {
      const slot = cursor++; if (!(slot in state)) state[slot] = initial;
      return [state[slot], (value) => { state[slot] = value; }];
    } },
    'react-native': { ActivityIndicator: 'Spinner', Pressable: 'Button', Text: 'Text', TextInput: 'Input', View: 'View',
      StyleSheet: { create: (value) => value }, Alert: { alert: (...args) => confirmations.push(args) }, Linking: { openURL: async () => {} } },
    '../../services/orders/order-queries': { useCancelOrder: () => mutation },
    '../../constants/support': { supportContact: { email: 'support@example.com', phone: '9876543210' }, supportPhone: '+919876543210' },
    './order-theme': { orderTheme: {} },
  });
  let buys = 0;
  const render = () => { cursor = 0; return CustomerOrderActions({ order, onBuyAgain: () => { buys++; } }); };
  const button = (label) => nodes(render()).find((node) => node.type === 'Button' && nodes(node).some((child) => child.props?.children === label));
  return { render, button, requests, confirmations, buys: () => buys, mutation };
}

test('eligible cancellation asks for a reason and confirmation and submits only once', async () => {
  const app = screen({ id: 'order', status: 'placed', canCancel: true });
  app.button('Cancel Order').props.onPress();
  assert.equal(app.button('Confirm cancellation').props.disabled, true);
  nodes(app.render()).find((node) => node.type === 'Input').props.onChangeText('Wrong size ordered');
  app.button('Confirm cancellation').props.onPress();
  assert.equal(app.requests.length, 0);
  const confirm = app.confirmations[0][2].find((button) => button.text === 'Confirm cancellation');
  confirm.onPress(); confirm.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(app.requests, [{ id: 'order', reason: 'Wrong size ordered' }]);
});

test('dispatched, out-for-delivery and partially dispatched orders offer support instead of cancellation', () => {
  for (const status of ['dispatched', 'out_for_delivery', 'placed']) {
    const app = screen({ status, canCancel: false, shipmentProgress: [{ fulfillmentStatus: 'dispatched' }] });
    assert.equal(app.button('Cancel Order'), undefined);
    assert.ok(app.button('Contact Support'));
  }
});

test('Received and Cancelled orders expose Buy Again; cancellation shows its audit and no payment due', () => {
  for (const status of ['delivered', 'cancelled']) {
    const app = screen({ status, canCancel: false, receivedAt: status === 'delivered' ? new Date().toISOString() : null,
      cancellation: status === 'cancelled' ? { at: new Date().toISOString(), reason: 'Wrong size' } : null });
    assert.ok(app.button('Buy Again')); app.button('Buy Again').props.onPress();
    assert.equal(app.buys(), 1);
    assert.equal(app.button('Cancel Order'), undefined);
    assert.equal(app.button('Contact Support'), undefined);
    if (status === 'cancelled') assert.ok(nodes(app.render()).some((node) => node.props.children === 'No COD payment is due.'));
  }
});

test('cancellation refreshes order state on failure as well as success', async () => {
  let mutation; const refreshed = []; const cached = [];
  const { useCancelOrder } = load('services/orders/order-queries.ts', {
    '../../hooks/useScreenActive': { useScreenActive: () => true },
    '../auth/session-scope': require('./helpers/load-source.cjs').sourceLoader()('services/auth/session-scope.ts'),
    '@react-navigation/native': { useIsFocused: () => true },
    '@tanstack/react-query': { useMutation: (options) => { mutation = options; return options; },
      useQueryClient: () => ({ setQueryData: (...args) => cached.push(args),
        invalidateQueries: async (input) => refreshed.push(input.queryKey[0]) }) },
    '../../context/AuthContext': { useAuth: () => ({ user: { id: 'buyer' } }) },
    '../api/order-api': { orderApi: { cancel() {} } }, '../cart/cart-queries': { cartQueryKey: ['cart'] },
  });
  useCancelOrder();
  assert.equal(mutation.retry, false);
  await mutation.onSettled(undefined, new Error('Dispatch already confirmed'));
  assert.ok(refreshed.includes('order')); assert.ok(refreshed.includes('orders'));
  mutation.onSuccess({ order: { id: 'order', status: 'cancelled' } });
  assert.deepEqual(cached[0][0], ['order', 'buyer', 'order']);
});

test('existing Buy Again sheet excludes unavailable variants and moves selected items to cart only', async () => {
  const requests = []; let added = 0;
  const order = { id: 'order', items: [
    { productId: 'shirt', name: 'Shirt', color: 'Blue', size: 'M', quantity: 1, price: 100 },
    { productId: 'shirt', name: 'Shirt', color: 'Blue', size: 'L', quantity: 2, price: 100 },
  ] };
  const preview = { items: [
    { ...order.items[0], price: 200, available: true, stock: 1, maxQuantity: 1, reason: null },
    { ...order.items[1], price: 200, available: false, stock: 1, maxQuantity: 0, reason: 'This size/color is out of stock.' },
  ], delivery: { serviceable: false, message: 'Choose a supported delivery address at checkout.' } };
  const { ReorderSheet } = load('components/shop/orders/ReorderSheet.tsx', {
    react: { useRef: (value) => ({ current: value }), useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}] },
    'react-native': { ActivityIndicator: 'Spinner', Image: 'Image', Modal: 'Modal', Pressable: 'Button', ScrollView: 'Scroll',
      Text: 'Text', View: 'View', StyleSheet: { create: (value) => value } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeArea' },
    '../../../services/orders/order-queries': {
      useReorder: () => ({ isPending: false, mutateAsync: async (input) => requests.push(input) }),
      useReorderPreview: () => ({ data: preview, isPending: false, isFetching: false, isError: false }),
    },
    '../../../utils/money': { money: (value) => `Rs ${value}` },
    '../../../services/products/stock': load('services/products/stock.ts', {}),
  });
  const tree = ReorderSheet({ order, onClose() {}, onAdded: () => { added++; } });
  const all = nodes(tree);
  assert.ok(all.some((node) => node.props.children === 'This size/color is out of stock.'));
  assert.ok(all.some((node) => node.props.children === preview.delivery.message));
  assert.ok(JSON.stringify(tree).includes('Rs 200'), 'current price is displayed');
  const button = all.find((node) => node.type === 'Button' && JSON.stringify(node.props.children)?.includes('Add selected to cart'));
  assert.equal(button.props.disabled, false, 'unavailable variant does not consume available variant stock');
  button.props.onPress(); button.props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(requests, [{ id: 'order', items: [{ productId: 'shirt', color: 'Blue', size: 'M', quantity: 1 }] }]);
  assert.equal(added, 1);
});
