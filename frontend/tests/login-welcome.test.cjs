const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = Module.createRequire(path.resolve(__dirname, '../package.json'))('typescript');

function render(query, onContinue = () => {}) {
  const filename = path.resolve(__dirname, '../features/auth/LoginWelcomeScreen.tsx');
  const target = new Module(filename);
  target.require = (name) => {
    if (name === 'react/jsx-runtime') return {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    };
    if (name === 'react-native') return {
      Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: (styles) => styles },
      Text: 'Text', View: 'View',
    };
    if (name === 'react') return {};
    if (name.endsWith('/product-queries')) return { useShopProducts: () => query };
    if (name.endsWith('/ThemeProvider')) return { useAppTheme: () => ({ colors: {
      background: '#fff', surface: '#fff', border: '#ddd', text: '#111', muted: '#777', raised: '#f5f5f5', primary: '#13872e',
    } }) };
    if (name.endsWith('/AppLoader')) return { AppLoader: 'Loader' };
    if (name.endsWith('/auth.styles')) return { authColors: { green: '#13872e', ink: '#082725', muted: '#4D5B62', background: '#FEFFFE' } };
    if (name.endsWith('safe-area-context')) return { SafeAreaView: 'SafeAreaView' };
    return require(name);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return target.exports.LoginWelcomeScreen({ onContinue });
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}

function visibleText(node) {
  return nodes(node).filter((item) => item.type === 'Text').map((item) => item.props.children).flat();
}

test('welcome screen lets users explore without waiting for products', () => {
  const tree = render({ isPending: true, isSuccess: false, isError: false, isFetching: true });
  const button = nodes(tree).find((item) => item.type === 'Pressable' && item.props.accessibilityRole === 'button');
  assert.equal(button.props.disabled, undefined);
  assert.ok(visibleText(tree).includes('Let’s Explore →'));
  let continued = false;
  const readyTree = render({ isPending: false, isSuccess: true }, () => { continued = true; });
  nodes(readyTree).find((item) => item.type === 'Pressable').props.onPress();
  assert.equal(continued, true);
  assert.ok(visibleText(tree).includes('Welcome to JhelumKart 👋'));
  assert.ok(visibleText(tree).includes('Your local shopping journey starts here.'));
  assert.ok(!visibleText(tree).includes('Could not load products.'));
});
