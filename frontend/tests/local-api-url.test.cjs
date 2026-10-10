const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadResolveApiUrl() {
  const filename = path.resolve(__dirname, '../services/api/api-url.ts');
  const target = new Module(filename);
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
  return target.exports.resolveApiUrl;
}

test('local API config resolves loopback to the Expo development host', () => {
  const resolveApiUrl = loadResolveApiUrl();
  assert.equal(
    resolveApiUrl('http://127.0.0.1:4000/api/v1', '192.168.1.24:8081', true),
    'http://192.168.1.24:4000/api/v1',
  );
});

test('production and explicit public endpoints are not rewritten', () => {
  const resolveApiUrl = loadResolveApiUrl();
  assert.equal(
    resolveApiUrl('https://api.zippcart.online/api/v1', '192.168.1.24:8081', true),
    'https://api.zippcart.online/api/v1',
  );
  assert.equal(
    resolveApiUrl('http://127.0.0.1:4000/api/v1', '192.168.1.24:8081', false),
    'http://127.0.0.1:4000/api/v1',
  );
});
