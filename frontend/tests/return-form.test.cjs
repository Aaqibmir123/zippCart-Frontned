const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(name, extension = '.tsx') {
  const filename = path.resolve(__dirname, '../features/returns/', name + extension);
  const target = new Module(filename);
  target.require = (id) => {
    if (id === 'react-native') return { Pressable: 'Pressable', Text: 'Text', View: 'View' };
    if (id === './ReturnControls') return { Field: 'Field', Choices: 'Choices' };
    if (id === './return.styles') return { rs: {} };
    if (id.endsWith('/money')) return { money: (n) => String(n) };
    return require(id);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return target.exports;
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
const { initialReturnItems, ReturnItemPicker } = load('ReturnItemPicker');
const order = { items: [{ name: 'Dress', quantity: 1, price: 100, color: 'Blue', size: 'M' }, { name: 'Shirt', quantity: 3, price: 50, color: '', size: '' }] };
test('return defaults to purchased quantities and omits single-item quantity controls', () => {
  const value = initialReturnItems(order, []);
  assert.deepEqual(value.map((item) => item.quantity), [1, 3]);
  const tree = nodes(ReturnItemPicker({ order, cases: [], value, onChange() {}, exchange: false }));
  assert.ok(!tree.some((node) => node.props.accessibilityLabel === 'Increase return quantity for Dress'));
  assert.ok(tree.some((node) => node.props.accessibilityLabel === 'Increase return quantity for Shirt' && node.props.disabled));
});
test('previous return quantities are excluded, selection can be removed separately from quantity', () => {
  const cases = [{ status: 'under_review', items: [{ index: 0, quantity: 1 }, { index: 1, quantity: 2 }] }];
  const value = initialReturnItems(order, cases);
  assert.deepEqual(value.map((item) => [item.index, item.quantity]), [[1, 1]]);
  let changed;
  const tree = nodes(ReturnItemPicker({ order, cases, value, onChange: (next) => { changed = next; }, exchange: false }));
  assert.ok(!tree.some((node) => node.props.accessibilityLabel?.startsWith('Increase')));
  tree.find((node) => node.props.accessibilityLabel === 'Select Shirt').props.onPress();
  assert.deepEqual(changed, []);
});
test('refund form offers only UPI and bank', () => {
  const { RefundPayoutForm } = load('RefundPayoutForm');
  const tree = nodes(RefundPayoutForm({ value: { method: 'upi', upiId: '' }, onChange() {} }));
  assert.deepEqual(tree.find((node) => node.type === 'Choices').props.values.map((item) => item.value), ['upi', 'bank']);
});

test('inspection requires an explicit bounded sellable quantity for each item', () => {
  const { inspectionItems } = load('../admin/returns/admin-action-model', '.ts');
  const record = { items: [{ index: 0, name: 'Dress', quantity: 2 }, { index: 3, name: 'Shirt', quantity: 1 }] };
  assert.throws(() => inspectionItems(record, { 0: '1' }), /sellable quantity/);
  for (const value of ['', ' ', '-1', '1.5', '3', 'NaN', '1e0'])
    assert.throws(() => inspectionItems(record, { 0: value, 3: '0' }), /sellable quantity/);
  assert.deepEqual(inspectionItems(record, { 0: '1', 3: '0' }), [{ index: 0, quantity: 1 }, { index: 3, quantity: 0 }]);
});
