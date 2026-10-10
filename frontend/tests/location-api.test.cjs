const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = Module.createRequire(path.resolve(__dirname, '../package.json'))('typescript');

test('reverse geocoding sends only latitude and longitude to the backend', async () => {
  const filename = path.resolve(__dirname, '../services/api/location-api.ts');
  const target = new Module(filename);
  let request;
  target.require = (name) => {
    if (name === './client') return {
      apiRequest: async (...args) => { request = args; return { address: null, countryCode: null }; },
    };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);

  const signal = new AbortController().signal;
  await target.exports.locationApi.reverseGeocode({ latitude: 34, longitude: 74 }, signal);
  assert.equal(request[0], '/location/reverse-geocode');
  assert.deepEqual(request[1].body, { latitude: 34, longitude: 74 });
  assert.deepEqual(Object.keys(request[1].body).sort(), ['latitude', 'longitude']);
  assert.equal(request[1].method, 'POST');
  assert.equal(request[1].signal, signal);
  assert.equal(request[1].timeoutMs, 8000);
});
