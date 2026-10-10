const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const frontendRequire = Module.createRequire(path.resolve(__dirname, '../package.json'));
const ts = frontendRequire('typescript');

// Inspect real JSX props with native host components substituted; no device renderer.
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  const target = new Module(filename);
  target.require = (specifier) => {
    if (specifier.endsWith('/AppLoader')) return { AppLoader: 'ActivityIndicator' };
    if (specifier === 'react-native') return {
      Pressable: 'Pressable', Text: 'Text', View: 'View', Image: 'Image',
      ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: (styles) => styles },
    };
    if (specifier === 'react-native-svg') return { __esModule: true, default: 'Svg', Path: 'Path' };
    if (specifier.endsWith('/order-theme')) return { orderTheme: {} };
    if (specifier.endsWith('/theme')) return { colors: {} };
    if (specifier.endsWith('/ThemeProvider')) return { useAppTheme: () => ({ isDark: false, colors: { background: '#fff', surface: '#fff', border: '#eee', text: '#000', muted: '#777', raised: '#f5f5f5', primary: '#7139F5' } }) };
    if (specifier.endsWith('/money')) return { money: (value) => String(value) };
    if (specifier.endsWith('/HomeIcon')) return { HomeIcon: 'HomeIcon' };
    return frontendRequire(specifier);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return target.exports;
}
function nodes(element, type) {
  if (!element || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap((child) => nodes(child, type));
  return [...(element.type === type ? [element] : []), ...nodes(element.props?.children, type)];
}
const { quantityLimit, productQuantity, stockIssue, variantAvailableStock } = load('services/products/stock.ts');
const { ProductPurchaseBar } = load('components/shop/ProductPurchaseBar.tsx');
const { CartItemRow } = load('components/shop/cart/CartItemRow.tsx');
const { CartPriceSummary } = load('components/shop/cart/CartPriceSummary.tsx');

test('cart variants share product stock while other products do not consume it', () => {
  const items = [{ productId: 'shirt', quantity: 2 }, { productId: 'shirt', quantity: 3 }, { productId: 'watch', quantity: 12 }];
  const combined = productQuantity(items, 'shirt');
  assert.equal(combined, 5);
  assert.equal(quantityLimit(5, combined - 2), 2);
  assert.equal(stockIssue(5, combined), null);
  assert.match(stockIssue(4, combined), /Only 4 available/);
});

test('quantity limits handle sold-out, invalid stock and the 99-item cap', () => {
  for (const stock of [0, -2, NaN, Infinity]) assert.equal(quantityLimit(stock), 0);
  assert.equal(quantityLimit(200), 99);
  assert.equal(quantityLimit(5, 7), 0);
  assert.equal(quantityLimit(3), 3);
});

const purchaseProps = { isAdded: false, isPending: false, outOfStock: false,
  cartLimitReached: false, cartLoading: false, onAddToCart() {}, onBuyNow() {} };
test('selected variant stock stays isolated; missing variants cannot be purchased', () => {
  const product = { stock: 5, variantStock: [{ color: 'Blue', size: 'M', stock: 0 }, { color: 'Blue', size: 'L', stock: 5 }] };
  assert.equal(variantAvailableStock(product, 'Blue', 'M'), 0);
  assert.equal(variantAvailableStock(product, 'Blue', 'L'), 5);
  assert.equal(variantAvailableStock(product, 'Pink', 'L'), 0);
});
test('closed stores disable new cart additions and Buy Now', () => {
  const buttons = nodes(ProductPurchaseBar({ ...purchaseProps, storeClosed: true }), 'Pressable');
  assert.ok(buttons.every((button) => button.props.disabled));
});
test('sold-out products disable both purchase actions with accessible disabled states', () => {
  const buttons = nodes(ProductPurchaseBar({ ...purchaseProps, outOfStock: true }), 'Pressable');
  assert.equal(buttons.length, 2);
  for (const button of buttons) {
    assert.equal(button.props.disabled, true);
    assert.equal(button.props.accessibilityState.disabled, true);
  }
});
test('cart stock limit blocks adding another variant but allows a separate Buy Now purchase', () => {
  const buttons = nodes(ProductPurchaseBar({ ...purchaseProps, cartLimitReached: true }), 'Pressable');
  assert.equal(buttons[0].props.disabled, true);
  assert.equal(buttons[1].props.disabled, false);
});
test('missing size/color selections disable both purchase actions and explain what to choose', () => {
  const tree = ProductPurchaseBar({ ...purchaseProps, variantSelectionRequired: true, selectionPrompt: 'Choose size and color' });
  const buttons = nodes(tree, 'Pressable');
  assert.equal(buttons[0].props.disabled, true);
  assert.equal(buttons[1].props.disabled, true);
  assert.ok(nodes(tree, 'Text').some((node) => node.props.children === 'Choose size and color'));
});

test('already-added products keep Go to Cart available even when stock runs out or cart refreshes', () => {
  let opened = false;
  const tree = ProductPurchaseBar({ ...purchaseProps, isAdded: true, outOfStock: true, cartLoading: true,
    cartLimitReached: true, cartStatus: 'Already added to cart', onAddToCart: () => { opened = true; } });
  const buttons = nodes(tree, 'Pressable');
  assert.equal(buttons[0].props.disabled, false);
  assert.equal(buttons[1].props.disabled, true);
  assert.ok(nodes(tree, 'Text').some((node) => node.props.children === 'Go to Cart'));
  buttons[0].props.onPress();
  assert.equal(opened, true);
});

const rowProps = { isPending: false, onOpen() {}, onRemove() {}, onQuantityChange() {},
  product: { id: 'shirt', name: 'Shirt', category: 'Fashion', price: 500, mrp: 600, stock: 3 },
  color: 'Blue', size: 'M', quantity: 3, maxQuantity: 3, stockMessage: null };
test('cart plus stops at stock limit and remains enabled below it', () => {
  const increase = (props) => nodes(CartItemRow(props), 'Pressable').find((node) => node.props.accessibilityLabel?.startsWith('Increase'));
  assert.equal(increase(rowProps).props.disabled, true);
  assert.equal(increase({ ...rowProps, quantity: 2 }).props.disabled, false);
});
test('stock reduction allows a single valid correction instead of a rejected decrement', () => {
  let quantity;
  const tree = CartItemRow({ ...rowProps, quantity: 8, onQuantityChange: (value) => { quantity = value; } });
  const decrease = nodes(tree, 'Pressable').find((node) => node.props.accessibilityLabel?.startsWith('Decrease'));
  decrease.props.onPress();
  assert.equal(quantity, 3);
});
test('unavailable cart items can be removed even when their quantity exceeds one', () => {
  let removed = false;
  const tree = CartItemRow({ ...rowProps, maxQuantity: 0, onRemove: () => { removed = true; } });
  const remove = nodes(tree, 'Pressable').find((node) => node.props.accessibilityLabel?.startsWith('Delete'));
  assert.equal(remove.props.disabled, false);
  remove.props.onPress();
  assert.equal(removed, true);
});
test('stock-blocked checkout is disabled without pretending a request is loading', () => {
  const tree = CartPriceSummary({ subtotal: 1500, mrp: 1800, quantity: 3, pending: false, blocked: true, onCheckout() {} });
  const button = nodes(tree, 'Pressable')[0];
  assert.equal(button.props.disabled, true);
  assert.equal(button.props.accessibilityState.busy, false);
  assert.equal(nodes(tree, 'ActivityIndicator').length, 0);
});
