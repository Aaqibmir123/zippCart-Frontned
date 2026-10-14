const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const tick = () => new Promise(setImmediate);
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const target = new Module(filename);
  target.require = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.endsWith('/ThemeProvider')) return { useAppTheme: () => ({ isDark: false, colors: { background: '#fff', surface: '#fff', border: '#eee', text: '#000', muted: '#777', raised: '#f5f5f5', primary: '#7139F5' } }) };
    if (name.startsWith('.')) {
      for (const suffix of ['.ts', '.tsx']) {
        const dependency = path.resolve(path.dirname(filename), name + suffix);
        if (fs.existsSync(dependency)) return load(path.relative(path.resolve(__dirname, '..'), dependency), mocks);
      }
    }
    return require(name);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  return target.exports;
}
const sample = { latitude: 34, longitude: 74, accuracy: 100, capturedAt: new Date().toISOString() };
const address = { locality: 'Central', district: 'Srinagar', city: 'Srinagar', state: 'Jammu and Kashmir', pincode: '190001' };
function fixture(overrides = {}, capture = async () => ({ status: 'captured', sample })) {
  const calls = [];
  const { reverseGeocode, ...locationOverrides } = overrides;
  const location = {
    getForegroundPermissionsAsync: async () => ({ granted: true }),
    requestForegroundPermissionsAsync: async () => { calls.push('permission'); return { granted: true }; },
    ...locationOverrides,
  };
  const loaded = load('features/location/delivery-location.ts', { 'expo-location': location,
    './device-location': { captureLocation: async (...args) => { calls.push('capture'); return capture(...args); } },
    '../../services/api/location-api': { locationApi: {
      reverseGeocode: async (coordinates, signal) => {
        calls.push('geocode');
        assert.deepEqual(coordinates, { latitude: sample.latitude, longitude: sample.longitude });
        return reverseGeocode ? reverseGeocode(coordinates, signal) : { address, countryCode: 'IN' };
      },
    } } });
  return { ...loaded, calls };
}

test('granted location fills postal fields but never guesses a flat or recipient', async () => {
  const app = fixture();
  const result = await app.detectDeliveryAddress(new AbortController().signal);
  assert.deepEqual(result, { status: 'ready', address: { locality: 'Central', district: 'Srinagar', city: 'Srinagar', state: 'Jammu and Kashmir', pincode: '190001' } });
  assert.deepEqual(app.calls, ['capture', 'geocode']);
  assert.equal('line1' in result.address, false);
});

test('automatic detection never opens a permission prompt; explicit action can request it', async () => {
  const permission = { granted: false, canAskAgain: true, status: 'undetermined' };
  const app = fixture({ getForegroundPermissionsAsync: async () => permission });
  assert.equal((await app.detectDeliveryAddress(new AbortController().signal)).status, 'permission');
  assert.deepEqual(app.calls, []);
  assert.equal((await app.detectDeliveryAddress(new AbortController().signal, true)).status, 'ready');
  assert.deepEqual(app.calls, ['permission', 'capture', 'geocode']);
});

test('permanent denial does not prompt or start GPS', async () => {
  const app = fixture({ getForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: false, status: 'denied' }) });
  assert.equal((await app.detectDeliveryAddress(new AbortController().signal, true)).status, 'denied');
  assert.deepEqual(app.calls, []);
});

test('unavailable GPS, missing provider results and non-Indian locations have explicit fallback states', async () => {
  const unavailable = fixture({}, async () => ({ status: 'unavailable' }));
  assert.equal((await unavailable.detectDeliveryAddress(new AbortController().signal)).status, 'unavailable');
  assert.deepEqual(unavailable.calls, ['capture']);
  for (const [result, status] of [[{ address: null, countryCode: null }, 'no_address'],
    [{ address, countryCode: 'US' }, 'outside_india']]) {
    const app = fixture({ reverseGeocode: async () => result });
    assert.equal((await app.detectDeliveryAddress(new AbortController().signal)).status, status);
  }
});

test('incomplete provider results remain available for manual address completion', async () => {
  const partial = { locality: '', district: 'District', city: '', state: 'Jammu and Kashmir', pincode: '' };
  const app = fixture({ reverseGeocode: async () => ({ address: partial, countryCode: 'IN' }) });
  assert.deepEqual(await app.detectDeliveryAddress(new AbortController().signal), { status: 'ready', address: partial });
});

test('backend lookup receives an abort signal and cancellation is not converted into an address', async () => {
  const app = fixture({ reverseGeocode: (_coordinates, signal) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Request cancelled.')), { once: true });
  }) });
  const controller = new AbortController();
  const promise = app.detectDeliveryAddress(controller.signal);
  await tick();
  controller.abort();
  await assert.rejects(promise, /cancelled/);
});

test('autofill preserves typed details; explicit location replacement changes only postal fields', () => {
  const { blankAddress, fillDetectedAddress, validateAddress } = load('components/shop/cart/address-form.ts');
  const detected = { locality: 'Detected area', district: 'District', city: 'City', state: 'State', pincode: '190001' };
  const draft = { ...blankAddress, locality: 'Typed area', line1: 'Flat 5', name: 'Customer', phone: '9876543210' };
  const filled = fillDetectedAddress(draft, detected);
  assert.equal(filled.locality, 'Typed area');
  assert.equal(filled.line1, 'Flat 5');
  assert.equal(filled.district, 'District');
  assert.deepEqual(validateAddress(filled), {});
  const replaced = fillDetectedAddress(filled, detected, true);
  assert.equal(replaced.locality, 'Detected area');
  assert.equal(replaced.name, draft.name);
  assert.equal(replaced.phone, draft.phone);
  assert.equal(replaced.line1, draft.line1);
  assert.equal(replaced.state, 'State');
  assert.deepEqual(validateAddress({ ...filled, city: '' }), {});
  assert.ok(validateAddress({ ...filled, id: 'legacy', district: '' }).district);
  assert.ok(validateAddress({ ...filled, district: '' }).district);
  assert.ok(validateAddress({ ...filled, pincode: '', name: '', line1: '' }).pincode);
});

function harness(renderHook) {
  const slots = []; let cursor = 0; const pending = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!slots[i]) slots[i] = { value: initial }; return [slots[i].value, (value) => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) { const old = slots[i]; slots[i] = { deps }; pending.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  const render = (...args) => { cursor = 0; const value = renderHook(react, ...args); while (pending.length) pending.shift()(); return value; };
  return { render, unmount: () => slots.forEach((slot) => slot?.cleanup?.()) };
}
function hookFixture(detect) {
  let hook; let listener; const calls = [];
  const AppState = { currentState: 'active', addEventListener: (_event, cb) => { listener = cb; return { remove() { if (listener === cb) listener = undefined; } }; } };
  const app = harness((react, user = 'buyer', auto = true, enabled = true) => {
    hook ??= load('features/location/useDeliveryLocation.ts', { react, 'react-native': { AppState },
      './delivery-location': { detectDeliveryAddress: async (signal, ask) => { calls.push({ signal, ask }); return detect(signal, ask); } } }).useDeliveryLocation;
    return hook(user, auto, enabled);
  });
  return { ...app, calls, event: (next) => { AppState.currentState = next; listener?.(next); } };
}

test('automatic detection is coalesced, does not prompt and is not repeated on ordinary rerenders', async () => {
  let finish;
  const app = hookFixture(() => new Promise((resolve) => { finish = resolve; }));
  app.render();
  await app.render().locate();
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].ask, false);
  finish({ status: 'ready', address: { city: 'City' } }); await tick();
  assert.equal(app.render().state.status, 'ready');
  app.render(); assert.equal(app.calls.length, 1);
  app.unmount();
});

test('leaving checkout cancels lookup; late results never overwrite the next account', async () => {
  const finishes = [];
  const app = hookFixture(() => new Promise((resolve) => finishes.push(resolve)));
  app.render(); app.render('buyer', true, false);
  assert.equal(app.calls[0].signal.aborted, true);
  finishes[0]({ status: 'ready', address: { city: 'Old' } }); await tick();
  assert.equal(app.render('buyer', true, false).state.status, 'idle');
  app.render('other', true, true);
  assert.equal(app.render('other', true, true).state.status, 'loading');
  app.unmount();
  assert.equal(app.calls[1].signal.aborted, true);
  finishes[1]({ status: 'ready', address: { city: 'Other' } }); await tick();
});

test('return from Settings retries granted permission without another prompt', async () => {
  let granted = false;
  const app = hookFixture(async () => granted ? { status: 'ready', address: { city: 'City' } } : { status: 'denied' });
  app.render(); await tick(); app.render();
  app.event('background'); granted = true; app.event('active'); await tick();
  assert.equal(app.render().state.status, 'ready');
  assert.deepEqual(app.calls.map((c) => c.ask), [false, false]);
  app.unmount();
});

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
test('delivery form exposes only the requested address fields and keeps them editable', () => {
  const app = harness((react, form) => {
    const { DeliveryAddressForm } = load('components/shop/cart/DeliveryAddressForm.tsx', { react,
      'react-native': { View: 'View', Text: 'Text', TextInput: 'Input', Pressable: 'Button', Linking: {} },
      '../../AppLoader': { AppLoader: 'Loader' }, './address.styles': { addressStyles: {} } });
    return DeliveryAddressForm({ form, errors: {}, pending: false, onChange() {} });
  });
  const form = { name: 'Customer', phone: '9876543210', line1: '', locality: 'Area', district: 'District', city: 'City', state: 'State', pincode: '190001', landmark: '', label: 'Home' };
  const tree = app.render(form, { status: 'ready' });
  const inputs = nodes(tree).filter((n) => n.type === 'Input');
  const labels = inputs.map((n) => n.props.accessibilityLabel);
  assert.deepEqual(labels, [
    'Village / Mohalla / Current Area', 'House / Nearby Landmark', 'District', 'PIN Code',
  ]);
  assert.equal(inputs[0].props.placeholder, 'e.g. your village or mohalla name');
  assert.ok(inputs.every((input) => input.props.editable));
  assert.equal(inputs[3].props.keyboardType, 'number-pad');
  assert.equal(inputs[3].props.maxLength, 6);
  assert.ok(!nodes(tree).some((n) => ['Use current location', 'Open Settings'].includes(n.props?.children)));
  for (const hiddenLabel of ['City / Town', 'Landmark', 'State', 'Recipient name', 'Mobile number', 'Flat number']) {
    assert.ok(!labels.includes(hiddenLabel), `${hiddenLabel} should not be visible as a separate field`);
  }
});

function cartFixture(saved = [], user = { id: 'buyer', fullName: 'Customer', phone: '9876543210' }) {
  let open = false; let finishSave; let failSave; const saves = []; const ready = [];
  const query = { isSuccess: true, isPending: false, isError: false, data: { addresses: saved } };
  const props = { get open() { return open; }, onOpenChange: (value) => { open = value; }, onReadyChange: (value) => ready.push(value) };
  let Cart;
  const app = harness((react) => {
    Cart ??= load('components/shop/cart/CartAddressSection.tsx', { react,
      'react-native': { View: 'View', Text: 'Text', Pressable: 'Button', Modal: 'Modal', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' } },
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
      '@react-navigation/native': { useIsFocused: () => true },
      '../../../context/AuthContext': { useAuth: () => ({ user }) },
      '../../../services/addresses/address-queries': { useAddresses: () => query,
        useSaveAddress: () => ({ mutateAsync: (input) => { saves.push(input); return new Promise((resolve, reject) => { failSave = reject; finishSave = () => { const address = { ...input, id: 'saved' }; query.data.addresses = [address]; resolve({ address }); }; }); } }),
        useRemoveAddress: () => ({}) },
      '../../../features/location/useDeliveryLocation': { useDeliveryLocation: () => assert.fail('Manual address entry must not detect location') },
      '../../../theme': { colors: { primary: 'purple' } },
      '../../../features/home/HomeIcon': { HomeIcon: 'Icon' },
      '../../AppLoader': { AppLoader: 'Loader' },
      './DeliveryAddressForm': { DeliveryAddressForm: 'Form' }, './address.styles': { addressStyles: {} },
    }).CartAddressSection;
    return Cart(props);
  });
  return { ...app, saves, ready, finishSave: () => finishSave(), failSave: (error) => failSave(error) };
}

test('manual checkout prefills only recipient details and saves one confirmed address', async () => {
  const app = cartFixture(); app.render();
  let tree = app.render();
  assert.equal(app.saves.length, 0);
  assert.ok(nodes(tree).some((n) => n.props?.children === 'Add delivery address'));
  nodes(tree).find((n) => n.props?.accessibilityLabel === 'Choose delivery address').props.onPress();
  tree = app.render();
  let form = nodes(tree).find((n) => n.type === 'Form');
  assert.equal(form.props.form.locality, '');
  assert.equal(form.props.form.pincode, '');
  assert.equal(form.props.form.name, 'Customer');
  assert.equal(form.props.form.phone, '9876543210');
  form.props.onChange('line1', 'Flat 5'); form.props.onChange('locality', 'User corrected area');
  form.props.onChange('district', 'Kupwara'); form.props.onChange('pincode', '193222');
  app.render(); tree = app.render(); form = nodes(tree).find((n) => n.type === 'Form');
  assert.equal(form.props.form.locality, 'User corrected area');
  assert.equal(form.props.form.line1, 'Flat 5');
  const save = nodes(tree).find((n) => n.type === 'Button' && nodes(n).some((child) => child.props?.children === 'Save & use this address'));
  save.props.onPress(); save.props.onPress();
  assert.equal(app.saves.length, 1);
  app.finishSave(); await tick(); app.render();
  assert.deepEqual(app.ready.at(-1), { shippingAddressId: 'saved', billingAddressId: 'saved' });
  app.unmount();
});

test('a saved delivery address remains selected and is never replaced by detected location', () => {
  const address = { id: 'home', name: 'Saved customer', phone: '9876543210', line1: 'House 2', locality: 'Saved area', district: 'District', city: 'Saved city', state: 'State', pincode: '190001', landmark: '', label: 'Home' };
  const app = cartFixture([address]); app.render(); const tree = app.render();
  assert.deepEqual(app.ready.at(-1), { shippingAddressId: 'home', billingAddressId: 'home' });
  assert.equal(app.saves.length, 0);
  assert.ok(nodes(tree).some((n) => n.props?.children === 'Home - Saved customer'));
  app.unmount();
});

test('recipient and delivery phone correction fields stay mounted while errors clear during typing', () => {
  const { blankAddress, validateAddress } = load('components/shop/cart/address-form.ts');
  let form = { ...blankAddress, ...address, line1: 'House 5' };
  let errors = validateAddress(form);
  let Form;
  const app = harness((react) => {
    Form ??= load('components/shop/cart/DeliveryAddressForm.tsx', { react,
      'react-native': { View: 'View', Text: 'Text', TextInput: 'Input', Pressable: 'Button', Linking: {} },
      '../../AppLoader': { AppLoader: 'Loader' }, './address.styles': { addressStyles: {} },
    }).DeliveryAddressForm;
    return Form({ form, errors, pending: false, location: { status: 'ready' }, onLocate() {},
      onChange(key, value) { form = { ...form, [key]: value }; delete errors[key]; } });
  });
  const input = (label) => nodes(app.render()).find((node) => node.props?.accessibilityLabel === label);
  for (const value of ['A', 'Al', 'Ali']) {
    assert.ok(input('Recipient name'), 'name must remain editable after clearing its error');
    input('Recipient name').props.onChangeText(value);
  }
  for (const value of ['9', '98', '9876543210']) input('Mobile number').props.onChangeText(value);
  assert.equal(input('Recipient name').props.value, 'Ali');
  assert.equal(input('Mobile number').props.value, '9876543210');
  assert.deepEqual(validateAddress(form), {});
  app.unmount();
});

const saveButton = (tree) => nodes(tree).find((node) => node.type === 'Button'
  && nodes(node).some((child) => child.props?.children === 'Save & use this address'));
const addressForm = (tree) => nodes(tree).find((node) => node.type === 'Form');

test('missing manual fields and profile name show exact errors beside Save and can be completed', async () => {
  const app = cartFixture([], { id: 'buyer', fullName: '', phone: '9876543210' });
  app.render();
  nodes(app.render()).find((node) => node.props?.accessibilityLabel === 'Choose delivery address').props.onPress();
  saveButton(app.render()).props.onPress();
  let tree = app.render();
  let form = addressForm(tree);
  assert.equal(app.saves.length, 0);
  const footer = nodes(tree).find((node) => node.type === 'View' && node.props?.children?.includes?.(saveButton(tree)));
  assert.ok(nodes(footer).some((node) => node.props?.accessibilityRole === 'alert'
    && node.props.children === form.props.errors.locality));
  form.props.onChange('locality', ' My village ');
  form.props.onChange('line1', ' House 7 ');
  form.props.onChange('district', ' Kupwara ');
  form.props.onChange('pincode', '193222');
  tree = app.render();
  assert.ok(nodes(tree).some((node) => node.props?.children === 'Enter recipient name.'));
  addressForm(tree).props.onChange('name', ' Ali ');
  tree = app.render();
  assert.equal(nodes(tree).filter((node) => node.props?.accessibilityRole === 'alert').length, 0);
  saveButton(tree).props.onPress();
  assert.equal(app.saves.length, 1);
  assert.equal(app.saves[0].name, 'Ali');
  assert.equal(app.saves[0].locality, 'My village');
  assert.equal(app.saves[0].line1, 'House 7');
  app.finishSave(); await tick(); app.render();
  assert.deepEqual(app.ready.at(-1), { shippingAddressId: 'saved', billingAddressId: 'saved' });
  app.unmount();
});

test('backend validation errors are attached to editable address fields and recover after correction', async () => {
  const { createApiError } = load('services/api/api-error.ts');
  const app = cartFixture(); app.render();
  nodes(app.render()).find((node) => node.props?.accessibilityLabel === 'Choose delivery address').props.onPress();
  addressForm(app.render()).props.onChange('line1', 'House 7');
  addressForm(app.render()).props.onChange('locality', 'Village');
  addressForm(app.render()).props.onChange('district', 'Kupwara');
  addressForm(app.render()).props.onChange('pincode', '193222');
  saveButton(app.render()).props.onPress();
  app.failSave(createApiError('Invalid request.', { status: 400, issues: { state: ['State is too long.'] } }));
  await tick();
  let tree = app.render();
  assert.equal(addressForm(tree).props.errors.state, 'State is too long.');
  assert.ok(nodes(tree).some((node) => node.props?.accessibilityRole === 'alert' && node.props.children === 'State is too long.'));
  addressForm(tree).props.onChange('state', 'Jammu and Kashmir');
  tree = app.render();
  assert.equal(nodes(tree).filter((node) => node.props?.accessibilityRole === 'alert').length, 0);
  saveButton(tree).props.onPress();
  assert.equal(app.saves.length, 2);
  app.finishSave(); await tick(); app.unmount();
});

test('invalid hidden postal values are validated and revealed for correction without requiring optional fields', () => {
  const { blankAddress, validateAddress } = load('components/shop/cart/address-form.ts');
  let form = { ...blankAddress, ...address, name: 'Ali', phone: '9876543210', line1: 'House 7', state: 'x'.repeat(81) };
  let errors = validateAddress(form);
  assert.equal(errors.state, 'State is too long.');
  let Form;
  const app = harness((react) => {
    Form ??= load('components/shop/cart/DeliveryAddressForm.tsx', { react,
      'react-native': { View: 'View', Text: 'Text', TextInput: 'Input', Pressable: 'Button', Linking: {} },
      '../../AppLoader': { AppLoader: 'Loader' }, './address.styles': { addressStyles: {} },
    }).DeliveryAddressForm;
    return Form({ form, errors, pending: false, location: { status: 'ready' }, onLocate() {},
      onChange(key, value) { form = { ...form, [key]: value }; delete errors[key]; } });
  });
  nodes(app.render()).find((node) => node.props?.accessibilityLabel === 'State').props.onChangeText('J');
  const stateInput = nodes(app.render()).find((node) => node.props?.accessibilityLabel === 'State');
  assert.equal(stateInput.props.value, 'J');
  stateInput.props.onChangeText('Jammu and Kashmir');
  assert.deepEqual(validateAddress({ ...form, city: '', state: '', landmark: '' }), {});
  app.unmount();
});

test('manual form requires all four fields, including district when editing a legacy address', () => {
  const { blankAddress, validateAddress } = load('components/shop/cart/address-form.ts');
  const manual = { ...blankAddress, name: 'Buyer', phone: '9876543210',
    locality: 'Test village', line1: 'Near the school', district: 'Kupwara', pincode: '193222' };
  assert.deepEqual(validateAddress(manual), {});
  for (const key of ['locality', 'line1', 'district', 'pincode']) {
    assert.ok(validateAddress({ ...manual, [key]: ' ' })[key]);
  }
  assert.ok(validateAddress({ ...manual, id: 'legacy', district: '' }).district);
  for (const pincode of ['12345', '1234567', '012345', '19A222']) {
    assert.ok(validateAddress({ ...manual, pincode }).pincode);
  }
});

test('editing a saved address preserves optional legacy address fields', async () => {
  const saved = { ...address, id: 'old', name: 'Buyer', phone: '9876543210',
    line1: 'House 1', landmark: 'Old landmark', label: 'Home' };
  const app = cartFixture([saved]); app.render();
  nodes(app.render()).find((node) => node.type === 'Button' && nodes(node).some((child) => child.props?.children === 'Edit')).props.onPress();
  addressForm(app.render()).props.onChange('line1', 'House 2');
  saveButton(app.render()).props.onPress();
  assert.deepEqual(app.saves[0], { ...saved, line1: 'House 2' });
  app.finishSave(); await tick(); app.unmount();
});
