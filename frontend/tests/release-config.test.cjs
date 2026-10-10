const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProductionApiUrl } = require('../scripts/validate-production-api.cjs');

test('release requires an API and accepts a public HTTPS API', () => {
  for (const value of [undefined, '', '   ']) assert.throws(() => validateProductionApiUrl(value));
  for (const value of ['https://api.zippcart.in/api/v1']) {
    assert.doesNotThrow(() => validateProductionApiUrl(value));
  }
});

test('release rejects LAN, insecure, credential-bearing and placeholder API URLs', () => {
  for (const value of [
    'http://api.zippcart.in/api/v1', 'https://localhost/api/v1',
    'https://192.168.1.35:4000/api/v1', 'https://[::1]/api/v1',
    'https://laptop.local/api/v1', 'https://api.example.com/api/v1',
    'https://user:password@api.zippcart.in/api/v1',
    'https://api.zippcart.in/api/v1?token=secret', 'not a URL',
  ]) assert.throws(() => validateProductionApiUrl(value));
});
