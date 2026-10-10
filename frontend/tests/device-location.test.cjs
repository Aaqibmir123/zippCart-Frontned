const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function fixture(overrides = {}) {
  const calls = { requested: 0, watched: 0, removed: 0 };
  let callback;
  const location = {
    Accuracy: { Balanced: 3 },
    getForegroundPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
    requestForegroundPermissionsAsync: async () => { calls.requested++; return { granted: false }; },
    hasServicesEnabledAsync: async () => true,
    watchPositionAsync: async (_options, next) => {
      calls.watched++; callback = next;
      return { remove: () => { calls.removed++; } };
    },
    ...overrides,
  };
  const filename = path.resolve(__dirname, '../features/location/device-location.ts');
  const target = new Module(filename);
  target.require = (name) => { if (name === 'expo-location') return location; throw new Error(name); };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  return { capture: target.exports.captureLocation, calls, emit: (fix) => callback(fix) };
}
const tick = () => new Promise(setImmediate);
const fix = (coords = {}, timestamp = Date.now()) => ({ timestamp, coords: { latitude: 34, longitude: 74, accuracy: 120, ...coords } });

test('permission denial never starts a location watcher or repeatedly prompts permanent denial', async () => {
  for (const canAskAgain of [true, false]) {
    const state = fixture({ getForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain, status: 'undetermined' }) });
    assert.deepEqual(await state.capture(new AbortController().signal), { status: 'denied' });
    assert.equal(state.calls.requested, Number(canAskAgain));
    assert.equal(state.calls.watched, 0);
  }
});

test('an earlier denial is respected without repeated prompts on later checkouts', async () => {
  const state = fixture({ getForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: true, status: 'denied' }) });
  assert.deepEqual(await state.capture(new AbortController().signal), { status: 'denied' });
  assert.equal(state.calls.requested, 0);
  assert.equal(state.calls.watched, 0);
});

test('first native permission grant proceeds to location capture', async () => {
  let asked = 0;
  const state = fixture({
    getForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: true, status: 'undetermined' }),
    requestForegroundPermissionsAsync: async () => { asked++; return { granted: true }; },
  });
  const pending = state.capture(new AbortController().signal);
  await tick();
  state.emit(fix());
  assert.equal((await pending).status, 'captured');
  assert.equal(asked, 1);
  assert.equal(state.calls.removed, 1);
});

test('fresh approximate location is accepted and GPS subscription is removed', async () => {
  const state = fixture();
  const pending = state.capture(new AbortController().signal);
  await tick();
  const point = fix(); state.emit(point);
  assert.deepEqual(await pending, { status: 'captured', sample: { ...point.coords, capturedAt: new Date(point.timestamp).toISOString() } });
  assert.equal(state.calls.removed, 1);
  assert.equal(state.calls.requested, 0);
});

test('invalid/stale fixes are ignored; cancellation removes watcher', async () => {
  const state = fixture(); const controller = new AbortController();
  const pending = state.capture(controller.signal);
  await tick();
  state.emit(fix({ latitude: NaN })); state.emit(fix({}, Date.now() - 16000));
  state.emit(fix({ longitude: 190 })); state.emit(fix({ accuracy: -1 }));
  controller.abort();
  assert.deepEqual(await pending, { status: 'unavailable' });
  assert.equal(state.calls.removed, 1);
});

test('a fix exactly 15 seconds old is accepted but an older fix is ignored', async () => {
  const state = fixture();
  const pending = state.capture(new AbortController().signal);
  await tick();
  state.emit(fix({}, Date.now() - 15001));
  const fresh = fix({}, Date.now() - 15000);
  state.emit(fresh);
  assert.deepEqual(await pending, {
    status: 'captured',
    sample: { ...fresh.coords, capturedAt: new Date(fresh.timestamp).toISOString() },
  });
});

test('disabled services and native errors return an optional unavailable result', async () => {
  for (const overrides of [{ hasServicesEnabledAsync: async () => false },
    { watchPositionAsync: async () => { throw new Error('Native failure'); } }]) {
    assert.deepEqual(await fixture(overrides).capture(new AbortController().signal), { status: 'unavailable' });
  }
});

test('timeout stops the watcher and late subscription setup is also cleaned up', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let install;
  let removed = 0;
  const state = fixture({ watchPositionAsync: () => new Promise((resolve) => { install = resolve; }) });
  const pending = state.capture(new AbortController().signal);
  await tick();
  t.mock.timers.tick(19999);
  assert.equal(state.calls.removed, 0);
  t.mock.timers.tick(1);
  assert.deepEqual(await pending, { status: 'unavailable' });
  install({ remove: () => { removed++; } });
  await tick();
  assert.equal(removed, 1);
});
