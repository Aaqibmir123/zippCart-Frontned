const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(file, mocks = {}) {
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
const fulfillment = load('features/orders/fulfillment.ts');
const { OrderHistoryCard } = load('components/shop/orders/OrderHistoryCard.tsx', {
  'react-native': { View: 'View', Text: 'Text', Pressable: 'Button', Image: 'Image' },
  '../../../features/orders/fulfillment': fulfillment,
  '../../../features/orders/order-presentation': { orderDate: () => '2 Oct', orderStatus: (o) => ({ label: o.status }) },
  '../../../features/orders/orders.styles': { s: {} }, '../../../utils/money': { money: String },
});
for (const status of ['placed', 'delivered']) {
  test(status + ' card keeps details and the appropriate reorder action', () => {
    let opened = 0; let reordered = 0;
    const tree = OrderHistoryCard({ order: { id: 'order123', status, total: 100, items: [{ name: 'Shirt', quantity: 1 }] },
      onOpen: () => opened++, onReorder: () => reordered++ });
    const buttons = nodes(tree).filter((node) => node.type === 'Button');
    buttons.find((node) => nodes(node).some((child) => child.props?.children === 'View order')).props.onPress();
    assert.equal(opened, 1);
    const buy = buttons.find((node) => node.props.accessibilityLabel === 'Buy this order again');
    if (status === 'placed') { assert.equal(buy, undefined); assert.equal(buttons.length, 2); }
    else { buy.props.onPress(); assert.equal(reordered, 1); }
  });
}
