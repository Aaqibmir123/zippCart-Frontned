const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(filename) {
  const target = new Module(filename);
  target.require = (name) => name === 'react-native'
    ? { View: 'View', Text: 'Text', StyleSheet: { create: (styles) => styles } }
    : name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name);
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return target.exports;
}
function texts(node) {
  if (Array.isArray(node)) return node.flatMap(texts);
  if (typeof node === 'string') return [node];
  return node && typeof node === 'object' ? texts(node.props?.children) : [];
}
const { FulfillmentTimeline } = load(path.resolve(__dirname, '../features/orders/FulfillmentTimeline.tsx'));
const statuses = ['placed', 'dispatched', 'delivered'];
test('confirmed timeline displays three stages and leaves delivery stages upcoming', () => {
  const tree = FulfillmentTimeline({ order: { status: 'placed', fulfillmentStatus: 'placed',
    fulfillmentTimeline: statuses.map((status, index) => ({ status, state: index < 0 ? 'complete' : index === 0 ? 'current' : 'upcoming', at: null })) } });
  const content = texts(tree);
  for (const label of ['Confirmed', 'Dispatched', 'Delivered']) assert.ok(content.includes(label));
  assert.equal(content.filter((text) => text === 'Upcoming').length, 2);
  assert.equal(content.filter((text) => text.includes('Current status')).length, 1);
  assert.ok(content.some((text) => text.includes('pack')));
});
test('missing timeline does not invent completed milestones for legacy API responses', () => {
  const content = texts(FulfillmentTimeline({ order: { status: 'dispatched' } }));
  assert.ok(content.includes('Dispatched'));
  assert.ok(!content.includes('Delivered'));
  assert.ok(!content.includes('Stage reached'));
});
