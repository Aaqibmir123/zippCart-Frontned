const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { createRequire } = require('node:module');
const ts = createRequire(path.resolve(__dirname, '../package.json'))('typescript');

const filename = path.resolve(
  __dirname,
  "../features/user/store-registration/registration-model.ts",
);
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const target = new Module(filename);
target._compile(compiled, filename);
const { createForm, validateStep, buildRegistrationPayload } = target.exports;

const photo = {
  uri: "file:///sample.jpg",
  name: "sample.jpg",
  mimeType: "image/jpeg",
};
const completeForm = () => ({
  ...createForm(),
  storeName: " Corner Store ",
  ownerName: "Sample Owner",
  mobile: "9876543210",
  category: "Grocery",
  address: "Shop 12, Main Road, Kupwara, Jammu & Kashmir",
  locality: "Main Market",
  pincode: "193222",
  storePhoto: photo,
  aadhaarCard: photo,
  shopLicense: photo,
  panCard: photo,
  upi: "corner@bank",
  acceptedTerms: true,
});

test("each step blocks its missing required fields", () => {
  const expected = [
    ["storeName", "ownerName", "mobile", "category"],
    ["address", "locality", "pincode"],
    ["storePhoto", "aadhaarCard", "shopLicense", "panCard"],
    ["upi", "acceptedTerms"],
  ];
  expected.forEach((keys, step) =>
    assert.deepEqual(
      Object.keys(validateStep(createForm(), step)).sort(),
      keys.sort(),
    ),
  );
});

test("complete UPI registration passes all four steps", () => {
  for (let step = 0; step < 4; step++)
    assert.deepEqual(validateStep(completeForm(), step), {});
});

test("invalid mobile, pincode, category fail format checks", () => {
  const form = {
    ...completeForm(),
    mobile: "1234567890",
    category: "unknown",
    pincode: "012345",
  };
  assert.ok(validateStep(form, 0).mobile);
  assert.ok(validateStep(form, 0).category);
  assert.ok(validateStep(form, 1).pincode);
});

test("bank payout requires its own fields and ignores inactive UPI input", () => {
  const form = { ...completeForm(), payoutMethod: "bank", upi: "invalid" };
  assert.deepEqual(Object.keys(validateStep(form, 3)).sort(), [
    "accountHolder",
    "accountNumber",
    "ifsc",
  ]);
  Object.assign(form, {
    accountHolder: "Sample Owner",
    accountNumber: "12345678901",
    ifsc: "SBIN0001234",
  });
  assert.deepEqual(validateStep(form, 3), {});
  form.ifsc = "SBIN1001234";
  assert.ok(validateStep(form, 3).ifsc);
});

test("terms cannot be skipped and a malformed UPI ID fails", () => {
  const errors = validateStep(
    { ...completeForm(), upi: "not-a-upi", acceptedTerms: false },
    3,
  );
  assert.ok(errors.upi);
  assert.ok(errors.acceptedTerms);
});

test("removing any required document blocks completion", () => {
  for (const key of ["storePhoto", "aadhaarCard", "shopLicense", "panCard"]) {
    assert.ok(validateStep({ ...completeForm(), [key]: null }, 2)[key]);
  }
});

test("request payload excludes server-owned status and the unselected payout method", () => {
  const form = completeForm();
  const payload = buildRegistrationPayload(form);
  assert.equal("status" in payload, false);
  assert.deepEqual(payload.aadhaarCard, photo);
  assert.deepEqual(payload.panCard, photo);
  assert.equal("panNumber" in payload, false);
  assert.equal("isActive" in payload, false);
  assert.equal(payload.storeName, "Corner Store");
  assert.equal(payload.sellerTermsAccepted, true);
  assert.deepEqual(payload.payout, { method: "upi", upiId: "corner@bank" });
  const bank = buildRegistrationPayload({
    ...form,
    payoutMethod: "bank",
    accountHolder: " Owner ",
    accountNumber: "12345678901",
    ifsc: "SBIN0001234",
  });
  assert.deepEqual(bank.payout, {
    method: "bank",
    accountHolder: "Owner",
    accountNumber: "12345678901",
    ifsc: "SBIN0001234",
  });
});

function registrationHook(loginPhone, existing) {
  const values = []; let cursor = 0; const cached = []; const submissions = []; const accountUpdates = [];
  const user = { id: 'submitter', phone: loginPhone, roles: ['customer'] };
  const source = path.resolve(__dirname, '../features/user/store-registration/useStoreRegistration.ts');
  const hookModule = new Module(source);
  hookModule.require = (id) => {
    if (id === 'react') return { useState(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
      return [values[index], (next) => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
    } };
    if (id === '@tanstack/react-query') return {
      useQueryClient: () => ({ setQueryData: (...args) => cached.push(args), invalidateQueries: async () => {}, removeQueries() {} }),
      useMutation: (options) => ({ isPending: false, reset() {}, mutateAsync: async () => {
        const result = await options.mutationFn(); await options.onSuccess(result); return result;
      } }),
    };
    if (id === './registration-model') return target.exports;
    if (id.endsWith('/AuthContext')) return { useAuth: () => ({ user, setUser: (account) => accountUpdates.push(account) }) };
    if (id.endsWith('/auth-api')) return { authApi: { me: async () => ({ user }) } };
    if (id === './store-api') return { storeQueryKey: (id) => ['store-registration', id], storeApi: {
      register: async (form, proof, revision) => {
        submissions.push({ form, proof, revision });
        return { store: { id: 'store', status: 'pending', isActive: false }, belongsToCurrentAccount: form.mobile === loginPhone };
      },
    } };
    throw new Error(`Unexpected hook dependency ${id}`);
  };
  hookModule._compile(ts.transpileModule(fs.readFileSync(source, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, source);
  const render = () => { cursor = 0; return hookModule.exports.useStoreRegistration(existing); };
  const initial = render();
  if (!existing) for (const [key, value] of Object.entries(completeForm())) initial.update(key, value);
  return { render, cached, submissions, accountUpdates };
}

test('different seller number requires proof and never promotes or caches its store on the submitting account', async () => {
  const f = registrationHook('9876543290');
  assert.equal(await f.render().next(), false);
  assert.match(f.render().errors.mobile, /Verify/);
  f.render().verifyPhone({ phone: '9876543210', ownerPhoneProof: 'verified-proof' });
  assert.equal(f.render().phoneVerified, true);
  for (let step = 0; step < 4; step++) assert.equal(await f.render().next(), true);
  assert.equal(f.submissions[0].proof, 'verified-proof');
  assert.equal(f.render().registeredPhone, '9876543210');
  assert.equal(f.cached.length, 0);
  assert.deepEqual(f.accountUpdates[0].roles, ['customer']);
});

test('changing a verified seller number clears proof, while own login number needs no additional OTP', async () => {
  const other = registrationHook('9876543290');
  other.render().verifyPhone({ phone: '9876543210', ownerPhoneProof: 'verified-proof' });
  other.render().update('mobile', '9876543211');
  assert.equal(other.render().phoneVerified, false);
  other.render().update('mobile', '9876543210');
  assert.equal(other.render().phoneVerified, false);
  const own = registrationHook('9876543210');
  for (let step = 0; step < 4; step++) assert.equal(await own.render().next(), true);
  assert.equal(own.submissions[0].proof, undefined);
  assert.equal(own.cached[0][0][1], 'submitter');
});

test('editing prefills saved details/documents, locks ownership and requires fresh OTP and terms', async () => {
  const existing = { id: 'store', status: 'rejected', storeName: 'Existing shop', ownerFullName: 'Seller',
    mobileNumber: '9876543210', storeCategory: 'Fashion', fullAddress: 'Main market, Kupwara',
    locality: 'Main market', pincode: '193222', applicationRevision: 3,
    payout: { method: 'bank', accountHolder: 'Seller', accountNumber: '12345678901', ifsc: 'SBIN0001234' },
    documents: ['storeFrontPhoto', 'aadhaarCard', 'panCard', 'shopLicense'] };
  const f = registrationHook(existing.mobileNumber, existing);
  assert.equal(f.render().form.storeName, 'Existing shop');
  assert.equal(f.render().form.accountNumber, '12345678901');
  assert.equal(f.render().form.panCard.saved, true);
  f.render().update('mobile', '9876543211');
  assert.equal(f.render().form.mobile, existing.mobileNumber);
  assert.equal(f.render().phoneVerified, false);
  assert.equal(await f.render().next(), false);
  f.render().verifyPhone({ phone: existing.mobileNumber, ownerPhoneProof: 'fresh-proof' });
  for (let step = 0; step < 3; step++) assert.equal(await f.render().next(), true);
  assert.equal(await f.render().next(), false, 'terms need a new acceptance');
  f.render().update('acceptedTerms', true);
  assert.equal(await f.render().next(), true);
  assert.equal(f.submissions[0].revision, 3);
  assert.equal(f.submissions[0].proof, 'fresh-proof');
});
