const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function renderOrderReviews(order, query) {
  let options;
  const filename = path.resolve(__dirname, '../features/reviews/OrderReviews.tsx');
  const target = new Module(filename);
  target.require = (specifier) => {
    if (specifier.endsWith('/ThemeProvider')) return { useAppTheme: () => ({ colors: { background: '#fff', surface: '#fff', raised: '#eee', text: '#111', muted: '#666', border: '#ddd', primary: '#00f' } }) };
    if (specifier.endsWith('/AppLoader')) return { AppLoader: 'ActivityIndicator' };
    if (specifier === 'react') return { useState: () => [null, () => {}] };
    if (specifier === 'react-native') return { ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', Text: 'Text', View: 'View' };
    if (specifier === '@tanstack/react-query') return { useQuery: (input) => { options = input; return query; } };
    if (specifier.endsWith('/AuthContext')) return { useAuth: () => ({ user: { id: 'buyer' } }) };
    if (specifier === './review-api') return { reviewApi: {} };
    if (specifier === './ReviewForm') return { ReviewForm: 'ReviewForm' };
    if (specifier === './review.styles') return { reviewStyles: {} };
    return require(specifier);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return { tree: target.exports.OrderReviews({ order }), options };
}
function textNodes(element) {
  if (Array.isArray(element)) return element.flatMap(textNodes);
  if (typeof element === 'string') return [element];
  return element && typeof element === 'object' ? textNodes(element.props?.children) : [];
}
const order = { id: 'order', status: 'delivered', items: [
  { productId: 'same-product', name: 'Dress', color: 'Blue', size: 'M' },
  { productId: 'same-product', name: 'Dress', color: 'Blue', size: 'L' },
] };
test('Rate Product is hidden and eligibility query disabled before delivery', () => {
  for (const status of ['placed', 'dispatched', 'out_for_delivery', 'cancelled']) {
    const result = renderOrderReviews({ ...order, status }, {});
    assert.equal(result.tree, null);
    assert.equal(result.options.enabled, false);
  }
});
test('only unreviewed exact order items get Rate Product even when product IDs repeat', () => {
  const result = renderOrderReviews(order, { data: { reviews: [{ itemIndex: 0, rating: 5, status: 'published' }] } });
  assert.equal(textNodes(result.tree).filter((text) => text === 'Rate Product').length, 1);
  assert.equal(result.options.enabled, true);
});
test('hidden reviews cannot be submitted again and failed eligibility lookup exposes no rate action', () => {
  const hidden = renderOrderReviews(order, { data: { reviews: [{ itemIndex: 0, rating: 5, status: 'hidden' }, { itemIndex: 1, rating: 1, status: 'published' }] } });
  assert.equal(textNodes(hidden.tree).includes('Rate Product'), false);
  const error = renderOrderReviews(order, { isError: true });
  assert.equal(textNodes(error.tree).includes('Rate Product'), false);
});
