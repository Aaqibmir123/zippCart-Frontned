const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = Module.createRequire(path.resolve(__dirname, '../package.json'))('typescript');

function render(onRetry) {
  const filename = path.resolve(__dirname, '../components/SessionLoader.tsx');
  const target = new Module(filename);
  target.require = (name) => {
    if (name === 'react') return { useEffect: (effect) => effect() };
    if (name === 'react/jsx-runtime') return {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    };
    if (name === 'react-native') return {
      Pressable: 'Pressable', StyleSheet: { create: (styles) => styles }, Text: 'Text', View: 'View',
    };
    if (name.endsWith('/SplashArtwork')) return { SplashArtwork: 'SplashArtwork' };
    return require(name);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return target.exports.SessionLoader({ onRetry });
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}

test('session splash stays static while startup checks the saved session', () => {
  const tree = render();
  assert.equal(tree.type, 'SplashArtwork');
  assert.equal(tree.props.children, null);
  assert.ok(!nodes(tree).some((node) => node.type === 'AppLoader'));
});

test('session splash preserves retry UI when session restore needs recovery', () => {
  let retried = false;
  const tree = render(() => { retried = true; });
  const button = nodes(tree).find((node) => node.type === 'Pressable');
  assert.ok(button);
  button.props.onPress();
  assert.equal(retried, true);
});
