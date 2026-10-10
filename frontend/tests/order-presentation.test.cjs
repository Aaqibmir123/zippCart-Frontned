const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = Module.createRequire(path.resolve(__dirname, '../package.json'))('typescript');
function load(filename) {
  const target = new Module(filename);
  target.require = (name) => load(path.resolve(path.dirname(filename), name + '.ts'));
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return target.exports;
}
const { isActiveOrder, orderStatus } = load(path.resolve(__dirname, '../features/orders/order-presentation.ts'));
test('delivery and closed returns move to Past while shipping and pending returns stay Active', () => {
  for (const status of ['placed', 'dispatched', 'return_requested', 'return_approved']) {
    assert.equal(isActiveOrder({ status }), true);
  }
  for (const status of ['delivered', 'completed', 'cancelled', 'return_completed', 'return_rejected']) {
    assert.equal(isActiveOrder({ status }), false);
  }
  assert.equal(isActiveOrder({ status: 'delivered', returnCases: [{ status: 'refund_pending' }] }), true);
  assert.equal(isActiveOrder({ status: 'delivered', returnCases: [{ status: 'refund_completed' }] }), false);
});
test('open return status overrides delivered badge without inventing delivery estimates', () => {
  const status = orderStatus({ status: 'delivered', returnCases: [{ status: 'pickup_pending' }] });
  assert.equal(status.label, 'Pickup pending');
  assert.equal(status.green, false);
  assert.equal(orderStatus({ status: 'dispatched' }).note, 'The seller has handed your parcel to admin for delivery.');
  assert.equal(orderStatus({ status: 'delivered' }).note, 'Delivery confirmed.');
});

test('seller preparation drives customer badge and message without calling ready orders shipped', () => {
  for (const [status, label] of [['placed', 'Confirmed'], ['preparing', 'Confirmed'], ['packed', 'Confirmed'], ['ready_for_dispatch', 'Confirmed'], ['dispatched', 'Dispatched'], ['out_for_delivery', 'Dispatched'], ['delivered', 'Delivered']]) {
    assert.equal(orderStatus({ status: 'placed', fulfillmentStatus: status }).label, label);
  }
  assert.match(orderStatus({ status: 'placed', fulfillmentStatus: 'ready_for_dispatch' }).note, /pack/);
  assert.match(orderStatus({ status: 'placed', fulfillmentStatus: 'packed' }).note, /pack/);
});
