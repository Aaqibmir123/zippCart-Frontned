const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function render(cases, orderPatch = {}, queryPatch = {}) {
  const state = [false, null];
  let cursor = 0;
  const filename = path.resolve(__dirname, '../features/returns/OrderReturns.tsx');
  const module = new Module(filename);
  module.require = (name) => {
    if (name.endsWith('/ThemeProvider')) return { useAppTheme: () => ({ colors: { background: '#fff', surface: '#fff', raised: '#eee', text: '#111', muted: '#666', border: '#ddd', primary: '#00f' } }) };
    if (name.endsWith('/AppLoader')) return { AppLoader: 'ActivityIndicator' };
    if (name === 'react') return { useState: () => { const i = cursor++; return [state[i], (value) => { state[i] = value; }]; } };
    if (name === 'react-native') return { View: 'View', Text: 'Text', Modal: 'Modal', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator' };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === './return-api') return { useReturnCases: () => ({ data: { cases }, ...queryPatch }) };
    if (name === './ReturnRequestSheet') return { ReturnRequestSheet: 'ReturnRequestSheet' };
    if (name === './ReturnItemPicker') return { remainingQuantity: () => 2 };
    if (name === './CustomerCaseScreen') return { CustomerCaseScreen: 'CustomerCaseScreen' };
    if (name === './ReturnControls') return { ActionButton: 'ActionButton' };
    if (name === './return-types') return { statusLabels: { under_review: 'Under review', cancelled: 'Cancelled' } };
    if (name === './return.styles') return { rs: {} };
    return require(name);
  };
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  const rerender = () => {
    cursor = 0;
    return module.exports.OrderReturns({ now: 1, order: { id: 'order', status: 'delivered', receivedAt: '2026-09-22', returnEligibleUntil: '2026-09-23', items: [{}], ...orderPatch } });
  };
  return { tree: rerender(), rerender };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
const record = { id: 'case', requestId: 'RET-CASE', status: 'under_review', items: [{ name: 'Dress', quantity: 1 }] };
test('existing request has one chat action, no create action, and opens directly on messages', () => {
  const view = render([record]);
  const actions = nodes(view.tree).filter((node) => node.type === 'ActionButton');
  assert.deepEqual(actions.map((node) => node.props.label), ['View request / Chat']);
  actions[0].props.onPress();
  const chat = nodes(view.rerender()).find((node) => node.type === 'CustomerCaseScreen');
  assert.equal(chat.props.caseId, 'case');
  assert.equal(chat.props.initialTab, 'messages');
});
test('new eligible order can request once; cancelled or stale cached requests cannot', () => {
  assert.ok(nodes(render([]).tree).some((node) => node.props.label === 'Request return / exchange'));
  for (const view of [render([{ ...record, status: 'cancelled' }]), render([], { returnCases: [{ id: 'case' }] }), render([record], {}, { isError: true })]) {
    assert.ok(!nodes(view.tree).some((node) => node.props.label === 'Request return / exchange'));
  }
});
