const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, mocks) {
  const filename = path.resolve(__dirname, '..', file);
  const module = new Module(filename);
  module.require = (name) => name.endsWith('/AppLoader') ? { AppLoader: 'ActivityIndicator' } : Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  return module.exports;
}
const native = { View: 'View', Text: 'Text', Modal: 'Modal', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: (s) => s } };
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
function hookHarness() {
  const values = []; let cursor = 0;
  const { useAdminConfirmation } = load('features/admin/components/useAdminConfirmation.tsx', {
    react: {
      useState: (initial) => { const index = cursor++; if (!(index in values)) values[index] = initial;
        return [values[index], (value) => { values[index] = value; }]; },
      useRef: (initial) => { const index = cursor++; return values[index] ??= { current: initial }; },
    }, 'react-native': native, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
  });
  return () => { cursor = 0; return useAdminConfirmation(); };
}
const button = (tree, label) => nodes(tree).find((n) => n.type === 'Pressable' && nodes(n).some((c) => c.type === 'Text' && c.props.children === label));
test('confirmation locks duplicate submission, blocks dismiss while saving, and waits for actual success', async () => {
  const render = hookHarness(); let resolve; let calls = 0; let done = 0;
  render().confirm({ title: 'Approve', message: 'Store approval', label: 'Approve', onDone: () => done++,
    onConfirm: () => { calls++; return new Promise((r) => { resolve = r; }); } });
  const submit = button(render().dialog, 'Approve');
  submit.props.onPress(); submit.props.onPress();
  assert.equal(calls, 1); assert.equal(button(render().dialog, 'Done'), undefined);
  render().dialog.props.onRequestClose(); assert.equal(render().dialog.props.visible, true);
  assert.equal(button(render().dialog, 'Go back').props.disabled, true);
  resolve(); await new Promise(setImmediate);
  button(render().dialog, 'Done').props.onPress();
  assert.equal(done, 1); assert.equal(render().dialog.props.visible, false);
});
test('failed confirmation remains open with server message and permits retry', async () => {
  const render = hookHarness(); let calls = 0;
  render().confirm({ title: 'Confirm', label: 'Save', message: 'Update', onConfirm: async () => { if (++calls === 1) throw new Error('Request changed. Refresh.'); } });
  button(render().dialog, 'Save').props.onPress(); await new Promise(setImmediate);
  assert.ok(nodes(render().dialog).some((n) => n.props.children === 'Request changed. Refresh.'));
  assert.equal(button(render().dialog, 'Done'), undefined);
  button(render().dialog, 'Save').props.onPress(); await new Promise(setImmediate);
  assert.ok(button(render().dialog, 'Done'));
});
test('queue tiles use API counts and route each selection without invented values', () => {
  const { queueOptions } = load('features/admin/dashboard/dashboard-api.ts', {
    '../../../hooks/useScreenActive': { useScreenActive: () => true },
    '@tanstack/react-query': {}, '../../../context/AuthContext': {}, '../../../services/api/client': {},
  });
  const { OrderQueueTiles } = load('features/admin/dashboard/OrderQueueTiles.tsx', {
    'react-native': native, './dashboard-api': { queueOptions }, './dashboard.styles': { ds: {} },
  });
  let selected;
  const counts = Object.fromEntries(queueOptions.map((option, index) => [option.key, index * 3]));
  const tiles = nodes(OrderQueueTiles({ counts, onSelect: (key) => { selected = key; } })).filter((n) => n.type === 'Pressable');
  assert.equal(tiles.length, queueOptions.length);
  tiles.forEach((tile, index) => {
    tile.props.onPress(); assert.equal(selected, queueOptions[index].key);
    assert.ok(nodes(tile).some((n) => n.type === 'Text' && n.props.children === index * 3));
  });
  assert.equal(new Set(queueOptions.map((q) => q.bg)).size, queueOptions.length);
});
test('payout overview separates current balance from period commission', () => {
  const { EarningsCards, PeriodSummary } = load('features/earnings/EarningsCards.tsx', {
    'react-native': native, './payout.styles': { ps: {} }, './earnings-api': {}, './settlement-model': { releaseLabel: () => '28 Sep 2026' },
    './payout-format': { cash: (value) => `Rs ${value / 100}`, dateLabel: () => '28 Sep 2026' },
  });
  const data = {
    period: 'week', collectedPaise: 100000, uncollectedPaise: 0,
    totals: { grossPaise: 100000, refundPaise: 0, commissionPaise: 12000, netPaise: 88000, eligiblePaise: 88000, orders: 1 },
    stores: [{ heldPaise: 20000 }], paidPaise: 30000, payablePaise: 58000,
    nextReleaseAt: '2026-09-27T18:30:00Z', holds: { cleared: { commissionPaise: 10000, collectedPaise: 80000 }, return_window: { commissionPaise: 2000, collectedPaise: 20000 } },
  };
  const overview = nodes(EarningsCards({ admin: true, data }));
  assert.ok(overview.some((n) => n.props.children === 'Rs 580'));
  assert.ok(overview.some((n) => n.props.label === 'On hold / upcoming' && n.props.value === 20000));
  assert.ok(overview.some((n) => n.props.label === 'Total paid to sellers' && n.props.value === 30000));
  const admin = nodes(PeriodSummary({ admin: true, data }));
  assert.ok(admin.some((n) => n.props.label === 'Calculated commission' && n.props.value === 12000));
  assert.ok(admin.some((n) => n.props.label === 'Verified collection (after refunds)' && n.props.value === 100000));
  const seller = nodes(PeriodSummary({ admin: false, data }));
  assert.ok(seller.some((n) => n.props.label === 'Commission deducted' && n.props.value === -12000));
  assert.ok(seller.some((n) => n.props.label === 'Your earnings' && n.props.value === 88000));
  assert.ok(seller.some((n) => n.props.children === 'Commission is already deducted. No separate payment is due.'));
});
