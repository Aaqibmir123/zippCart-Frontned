const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = Module.createRequire(path.resolve(__dirname, '../package.json'))('typescript');

function render() {
  const filename = path.resolve(__dirname, '../components/shop/checkout/PaymentMethods.tsx');
  const target = new Module(filename);
  target.require = (name) => {
    if (name === 'react/jsx-runtime') return {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    };
    if (name === 'react-native') return { Pressable: 'Pressable', Text: 'Text', View: 'View' };
    if (name.endsWith('/ThemeProvider')) return { useAppTheme: () => ({ colors: {
      surface: '#fff', border: '#ddd', text: '#111', raised: '#f5f5f5', primary: '#13872e', muted: '#777',
    } }) };
    if (name.endsWith('/checkout.styles')) return { checkoutStyles: {} };
    return require(name);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return target.exports.PaymentMethods({ selected: true, onSelect() {}, disabled: false });
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}

test('checkout offers COD and keeps online payment disabled without provider-specific wallet options', () => {
  const tree = render();
  const choices = nodes(tree).filter((node) => node.props?.accessibilityRole === 'radio');
  assert.equal(choices.length, 2);
  assert.deepEqual(choices.map((choice) => choice.props.accessibilityLabel), [
    'Cash on delivery', 'Pay now, coming soon',
  ]);
  assert.equal(choices[0].props.accessibilityState.checked, true);
  assert.equal(choices[0].props.accessibilityState.disabled, false);
  assert.equal(choices[1].props.accessibilityState.disabled, true);
});
