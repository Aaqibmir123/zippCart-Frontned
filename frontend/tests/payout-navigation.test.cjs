const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, mocks) {
  const filename = path.resolve(__dirname, '..', file);
  const module = new Module(filename);
  module.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  return module.exports;
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
test('changing payout period, seller or section resets pagination and retains store scope', () => {
  const values = [];
  let cursor = 0;
  let request;
  const { usePayoutStatement } = load('features/earnings/usePayoutStatement.ts', {
    react: { useState: (initial) => {
      const index = cursor++;
      if (!(index in values)) values[index] = initial;
      return [values[index], (value) => { values[index] = value; }];
    } },
    './earnings-api': { localDate: () => '2026-09-23', useEarnings: (...args) => { request = args; return {}; } },
  });
  const render = () => { cursor = 0; return usePayoutStatement(true); };
  assert.equal(render().period, 'week');
  render().selectStore('seller1');
  render().setPage(4);
  render().selectTab('History');
  assert.equal(render().page, 1);
  assert.equal(render().storeId, 'seller1');
  render().setPage(2);
  render().shift(-1);
  render();
  assert.deepEqual(request, [true, 'week', '2026-09-16', 'seller1', 1, 'all']);
  render().selectPeriod('month');
  render().shift(-1);
  render();
  assert.deepEqual(request, [true, 'month', '2026-08-01', 'seller1', 1, 'all']);
  render().resetDate(); render();
  assert.equal(request[2], '2026-09-23');
  render().setPage(3);
  render().selectFilter('return_window'); render();
  assert.equal(request[4], 1);
  assert.equal(request[5], 'return_window');
});

test('operational cards use their own status colors; return and exchange badges remain distinct', () => {
  const model = load('features/orders/operations-model.ts', {});
  const { AdminOrderCard } = load('features/admin/shipping/AdminOrderCard.tsx', {
    'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View' },
    '../../orders/OperationsBadges': { OperationsBadges: 'OperationsBadges' },
    '../../orders/operations-model': model,
    '../../earnings/SettlementBadge': { SettlementBadge: 'SettlementBadge' },
    '../../../utils/money': { money: String }, '../dashboard/dashboard.styles': { ds: {} },
  });
  const order = { id: '123456789', createdAt: '2026-09-23', itemCount: 2, total: 1000, paymentMethod: 'cod', settlements: [] };
  const render = (stage, support = []) => AdminOrderCard({ order: { ...order, operations: { stage, support } }, number: 4, onOpen: () => {} });
  const confirmed = render('new');
  const processing = render('preparing');
  assert.notEqual(confirmed.props.style[1].backgroundColor, processing.props.style[1].backgroundColor);
  assert.notEqual(render('delivered', ['return']).props.style[1].backgroundColor, render('delivered', ['exchange']).props.style[1].backgroundColor);
  assert.ok(nodes(confirmed).some((node) => node.props.children === 4));
});

test('settlement messaging anchors the hold to receipt and keeps transfers separate', () => {
  const { settlementNote } = load('features/earnings/settlement-model.ts', {});
  assert.match(settlementNote({ state: 'awaiting_delivery' }), /customer confirms receipt/);
  assert.match(settlementNote({ state: 'return_window', releaseAt: '2026-09-23T10:00:00Z' }), /23 Sept?.*3:30.*IST/);
  assert.match(settlementNote({ state: 'return_open' }), /until the return \/ exchange case is resolved/);
  assert.match(settlementNote({ state: 'cleared' }), /transfer is recorded separately/);
});

test('order earnings identify products and sellers cannot verify collections', () => {
  const { OrderEarnings } = load('features/earnings/StatementRows.tsx', {
    'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View' },
    './SettlementBadge': { SettlementBadge: 'SettlementBadge' }, './EarningsCards': { Line: 'Line' }, './payout.styles': { ps: {} },
    './payout-format': { cash: String, dateLabel: () => '23 Sep' },
  });
  const data = { orderCount: 1, stores: [{ storeId: 'seller1', name: 'Store' }], orders: [{
    orderId: 'order12345', storeId: 'seller1', receivedAt: '2026-09-23',
    items: [{ name: 'Shirt', quantity: 2, amountPaise: 100000 }], refundPaise: 0,
    commissionBps: 1200, commissionPaise: 12000, netPaise: 88000, paymentVerified: false,
    holdReason: 'Payment collection unverified',
  }] };
  const seller = nodes(OrderEarnings({ data, admin: false }));
  assert.ok(seller.some((n) => n.props.label === 'Shirt × 2' && n.props.value === 100000));
  assert.ok(seller.some((n) => n.props.label === 'Your earnings' && n.props.value === 88000));
  assert.equal(seller.filter((n) => n.type === 'Pressable').length, 0);
  let selected;
  const admin = nodes(OrderEarnings({ data, admin: true, onCollect: (id) => { selected = id; } }));
  admin.find((n) => n.type === 'Pressable').props.onPress();
  assert.equal(selected, 'order12345');
});
