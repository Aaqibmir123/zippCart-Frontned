const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function setup({ base64 = 'JVBERi0xLjQ=', writeFails = false, empty = false } = {}) {
  const writes = [];
  let printOptions;
  const filename = path.resolve(__dirname, '../features/admin/shipping/shipping-label-pdf.ts');
  const target = new Module(filename);
  target.require = (specifier) => {
    if (specifier === 'expo-print') return { printToFileAsync: async (options) => {
      printOptions = options;
      return { uri: 'file:///not-readable/Print/document.pdf', base64 };
    } };
    if (specifier === 'expo-file-system') return { Paths: { cache: 'file:///app-scoped/cache/' }, File: class {
      constructor(parent, name) { this.uri = parent + name; this.exists = false; this.size = 0; }
      create() { this.exists = true; }
      write(data, options) {
        if (writeFails) throw new Error('Disk full');
        assert.equal(options.encoding, 'base64');
        this.size = empty ? 0 : Buffer.from(data, 'base64').length;
        writes.push({ uri: this.uri, data });
      }
    } };
    if (specifier === './shipping-label-html') return { labelHtml: () => '<html>Label with QR</html>' };
    throw new Error(`Unexpected import ${specifier}`);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return { create: () => target.exports.createShareableLabelPdf({ reference: 'ZC/123' }, 'QR'), writes, options: () => printOptions };
}

test('PDF is written into readable app cache instead of sharing the denied Print URI', async () => {
  const fixture = setup();
  const uri = await fixture.create();
  assert.match(uri, /^file:\/\/\/app-scoped\/cache\/ZippCart-ZC_123-\d+\.pdf$/);
  assert.doesNotMatch(uri, /not-readable/);
  assert.equal(fixture.options().base64, true);
  assert.equal(Buffer.from(fixture.writes[0].data, 'base64').toString(), '%PDF-1.4');
});
test('missing PDF bytes, write failures and empty files never return a share URI', async () => {
  await assert.rejects(setup({ base64: '' }).create(), /could not be generated/);
  await assert.rejects(setup({ writeFails: true }).create(), /Disk full/);
  await assert.rejects(setup({ empty: true }).create(), /Could not save/);
});
