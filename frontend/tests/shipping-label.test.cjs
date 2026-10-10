const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../features/admin/shipping/shipping-label-html.ts');
const target = new Module(filename);
target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { labelHtml } = target.exports;
const label = { reference: 'ZC-123', qrValue: 'ZC-123', orderId: 'abc123', orderDate: '2026-09-20',
  customer: { name: '<script>alert(1)</script>', phone: '9999999999', address: 'House & Road' },
  packages: 1, itemCount: 2, payment: 'COD', collectAmount: 1200,
  items: [{ name: 'Dress <Blue>', color: 'Blue', size: 'M', quantity: 2 }] };
test('print and share HTML embeds the QR image and complete shipment details', () => {
  const html = labelHtml(label, 'aGVsbG8=');
  assert.match(html, /src="data:image\/png;base64,aGVsbG8="/);
  assert.match(html, /Collect INR 1200.00/);
  assert.match(html, /Dress &lt;Blue&gt;/);
  assert.match(html, /Blue \/ M/);
  assert.match(html, /size: A4/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /House &amp; Road/);
});
test('missing or unsafe QR data prevents exporting a label without its QR', () => {
  assert.throws(() => labelHtml(label, ''), /QR image/);
  assert.throws(() => labelHtml(label, '" onerror="alert(1)'), /QR image/);
});
