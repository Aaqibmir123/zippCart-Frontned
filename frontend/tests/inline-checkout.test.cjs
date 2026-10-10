const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const req = Module.createRequire(path.resolve(__dirname, '../package.json'));
const ts = req('typescript');
function render(overrides = {}, queryOverrides = {}, mutate = async () => ({ order: { id: 'saved' } }), requestLocation = async () => ({ status: 'skipped' })) {
  const filename = path.resolve(__dirname, '../components/shop/checkout/InlineCheckout.tsx');
  const target = new Module(filename);
  const calls = [];
  target.require = (name) => {
    if (name.endsWith('/ThemeProvider')) return { useAppTheme: () => ({ isDark: false, colors: { background: '#fff', surface: '#fff', border: '#eee', text: '#000', muted: '#777', raised: '#f5f5f5', primary: '#7139F5' } }) };
    if (name.endsWith('/AppLoader')) return { AppLoader: 'ActivityIndicator' };
    if (name === 'react') return { useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] };
    if (name.endsWith('/LocationProvider')) return { useCheckoutLocation: () => ({ requestForCheckout: requestLocation }) };
    if (name === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable', ActivityIndicator: 'Spinner' };
    if (name.endsWith('/order-queries')) return {
      useCheckoutQuote: () => ({ error: new Error('Quote unavailable'), data: { quote: { checkoutKey: 'server-key', items: [
        { productId: 'p1', name: 'Fresh apples', price: 100, quantity: 1 },
      ], subtotal: 100, delivery: 50, total: 150 } }, ...queryOverrides }),
      usePlaceOrder: () => ({ mutateAsync: async (input) => { calls.push(input); return mutate(input); } }),
    };
    if (name.endsWith('/money')) return { money: String };
    if (name.endsWith('/PaymentMethods')) return { PaymentMethods: 'PaymentMethods' };
    if (name.endsWith('/checkout.styles')) return { checkoutStyles: {} };
    return req(name);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  const props = { address: { shippingAddressId: 'a', billingAddressId: 'a' }, revision: 1,
    blocked: false, busy: false, onAddress() {}, onBusy() {}, onSuccess() {}, ...overrides };
  const tree = target.exports.InlineCheckout(props);
  function buttons(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(buttons);
    return [...(node.type === 'Pressable' ? [node] : []), ...buttons(node.props?.children)];
  }
  return { button: buttons(tree).at(-1), calls, tree, summary: target.exports.CheckoutQuoteSummary };
}
function textNodes(node) {
  if (Array.isArray(node)) return node.flatMap(textNodes);
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  return node && typeof node === 'object' ? textNodes(node.props?.children) : [];
}
test('stale, blocked or pending totals cannot place an order', () => {
  for (const [props, query] of [[{ address: null }, {}], [{ blocked: true }, {}], [{ busy: true }, {}], [{}, { isFetching: true }], [{}, { isError: true }], [{}, { data: undefined }]]) {
    assert.equal(render(props, query).button.props.disabled, true);
  }
});
test('double tap sends one COD order using the server quote and reports success', async () => {
  let complete;
  let saved;
  const { button, calls } = render({ onSuccess: (id) => { saved = id; } }, {}, () => new Promise((resolve) => { complete = resolve; }));
  button.props.onPress(); button.props.onPress();
  await new Promise(setImmediate);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { shippingAddressId: 'a', billingAddressId: 'a', checkoutKey: 'server-key', paymentMethod: 'cod', location: { status: 'skipped' } });
  complete({ order: { id: 'saved' } });
  await new Promise(setImmediate);
  assert.equal(saved, 'saved');
});

test('checkout has no bill summary and waits for the server quote before placing order', () => {
  const result = render({}, { isFetching: true, isPlaceholderData: true });
  const texts = textNodes(result.tree);
  assert.ok(!texts.includes('Bill summary'));
  assert.ok(!texts.includes('Subtotal'));
  assert.ok(!texts.includes('Delivery charges'));
  assert.ok(!texts.some((text) => text.includes('Your location helps')));
  assert.equal(result.button.props.disabled, true);
});

test('denied and unavailable location still place orders; a shared fix is forwarded', async () => {
  for (const location of [{ status: 'denied' }, { status: 'unavailable' },
    { status: 'captured', sample: { latitude: 34, longitude: 74, accuracy: 100, capturedAt: new Date().toISOString() } }]) {
    const { button, calls } = render({}, {}, undefined, async () => location);
    button.props.onPress();
    await new Promise(setImmediate);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].location, location);
  }
});

test('waiting for location locks checkout and cancellation prevents placing after logout', async () => {
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const { button, calls } = render({}, {}, undefined, () => pending);
  button.props.onPress(); button.props.onPress();
  assert.equal(calls.length, 0);
  finish({ status: 'denied' });
  await new Promise(setImmediate);
  assert.equal(calls.length, 1);
  const cancelled = render({}, {}, undefined, async () => { throw new Error('Signed out'); });
  cancelled.button.props.onPress();
  await new Promise(setImmediate);
  assert.equal(cancelled.calls.length, 0);
});
