const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const captured = { status: 'captured', sample: { latitude: 34, longitude: 74, accuracy: 100, capturedAt: new Date().toISOString() } };

function mount(capture = async () => captured) {
  let cursor = 0;
  let calls = 0;
  const slots = [];
  const cleanups = [];
  const filename = path.resolve(__dirname, '../features/location/LocationProvider.tsx');
  const target = new Module(filename);
  target.require = (name) => {
    if (name === 'react') return {
      createContext: () => ({ Provider: 'Context' }),
      useRef: (initial) => slots[cursor++] ??= { current: initial },
      useEffect: (fn) => { cleanups.push(fn()); },
    };
    if (name === './device-location') return { captureLocation: (signal) => { calls++; return capture(signal); } };
    return require(name);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  const tree = target.exports.LocationProvider({ children: 'content' });
  return { request: tree.props.value.requestForCheckout, tree, calls: () => calls,
    unmount: () => cleanups.forEach((fn) => fn?.()) };
}

test('startup renders children with no custom permission dialog or location capture', () => {
  const app = mount();
  assert.equal(app.tree.props.children, 'content');
  assert.equal(app.calls(), 0);
  app.unmount();
});

test('checkout directly captures through the native location flow', async () => {
  const app = mount();
  assert.deepEqual(await app.request(), captured);
  assert.equal(app.calls(), 1);
  await app.request();
  assert.equal(app.calls(), 2);
  app.unmount();
});

test('denied and unavailable location finish checkout without an app popup', async () => {
  for (const status of ['denied', 'unavailable']) {
    const app = mount(async () => ({ status }));
    assert.deepEqual(await app.request(), { status });
    assert.equal(app.tree.props.children, 'content');
    app.unmount();
  }
});

test('duplicate requests share a capture, and logout cancels pending checkout', async () => {
  let finish;
  let signal;
  const app = mount((value) => { signal = value; return new Promise((resolve) => { finish = resolve; }); });
  const first = app.request();
  const second = app.request();
  assert.equal(first, second);
  assert.equal(app.calls(), 1);
  const rejected = assert.rejects(first, /cancelled/);
  app.unmount();
  assert.equal(signal.aborted, true);
  finish(captured);
  await rejected;
  await assert.rejects(app.request(), /cancelled/);
});
