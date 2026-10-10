const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = Module.createRequire(path.resolve(__dirname, '../package.json'))('typescript');
const filename = path.resolve(__dirname, '../features/returns/payout-model.ts');
const target = new Module(filename);
target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { buildPayout, emptyPayout, maskedPayout } = target.exports;
const bank = () => ({ ...emptyPayout('bank'), accountHolder: ' Test Buyer ', accountNumber: '00123456789',
  confirmAccount: '00123456789', ifsc: 'sbin0001234' });

test('bank input preserves leading zeroes, confirms the number, and normalizes IFSC', () => {
  assert.deepEqual(buildPayout(bank()), { method: 'bank', accountHolder: 'Test Buyer', accountNumber: '00123456789', ifsc: 'SBIN0001234' });
  assert.throws(() => buildPayout({ ...bank(), confirmAccount: '00123456788' }), /do not match/);
  assert.throws(() => buildPayout({ ...bank(), ifsc: 'SBIN1001234' }), /IFSC/);
  assert.throws(() => buildPayout({ ...bank(), accountNumber: '123' }), /9–18/);
});
test('UPI requires a handle, trims whitespace and never sends inactive bank data', () => {
  assert.deepEqual(buildPayout({ ...bank(), method: 'upi', upiId: ' Buyer@Bank ' }), { method: 'upi', upiId: 'buyer@bank' });
  for (const upiId of ['9876543210', 'a@', 'name @bank', 'name@bank@bank', ''])
    assert.throws(() => buildPayout({ ...emptyPayout(), upiId }), /valid UPI/);
});
test('review masks payout information and cash does not carry bank or UPI fields', () => {
  assert.equal(maskedPayout(bank()), 'Bank account ending 6789');
  assert.equal(maskedPayout({ ...emptyPayout(), upiId: 'buyer@bank' }), 'bu***@bank');
  assert.deepEqual(buildPayout({ ...bank(), method: 'cash', upiId: 'buyer@bank' }), { method: 'cash' });
});
