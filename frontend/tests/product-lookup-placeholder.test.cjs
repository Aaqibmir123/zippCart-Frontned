const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function lookupOptions({ lists = [], details = new Map() } = {}) {
  let options;
  const filename = path.resolve(__dirname, '../services/products/product-queries.ts');
  const target = new Module(filename);
  target.require = (name) => {
    if (name === '@tanstack/react-query') return {
      useInfiniteQuery: () => ({}),
      useQuery: (value) => { options = value; return value; },
      useQueryClient: () => ({
        getQueriesData: () => lists.map((data) => [['shop-products'], data]),
        getQueryData: (key) => details.get(key[1]),
      }),
    };
    if (name === '../api/product-api') return { productApi: { lookup() {} } };
    return require(name);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
  target.exports.useShopProductLookup(['one', 'two']);
  return options;
}

test('product lookup displays cached products while confirming availability with the server', () => {
  const options = lookupOptions({
    lists: [{ pages: [{ products: [{ id: 'one', name: 'First' }] }] }],
    details: new Map([['two', { product: { id: 'two', name: 'Second', sizes: ['M'] } }]]),
  });
  assert.deepEqual(options.placeholderData.products.map((product) => product.name), ['First', 'Second']);
  assert.equal(options.enabled, true);
  assert.equal(typeof options.queryFn, 'function');
});

test('product lookup does not treat incomplete cache data as the whole cart', () => {
  const options = lookupOptions({ lists: [{ pages: [{ products: [{ id: 'one', name: 'First' }] }] }] });
  assert.equal(options.placeholderData, undefined);
});
