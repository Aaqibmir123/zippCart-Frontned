// Read-only deployment check. No account cookies, tokens or writes are used.
const { build } = require('../eas.json');
const base = (process.env.EXPO_PUBLIC_API_URL || build.production.env.EXPO_PUBLIC_API_URL).replace(/\/$/, '');

async function check() {
  let failed = false;
  for (const endpoint of ['/auth/me', '/location', '/notifications/inbox']) {
    try {
      const response = await fetch(base + endpoint, { redirect: 'error', signal: AbortSignal.timeout(10000) });
      // The current routers authenticate before matching a method or endpoint.
      // A 404 here means that router is absent from the deployed backend.
      const ok = response.status === 401;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${endpoint}: HTTP ${response.status} (expected 401 without a session)`);
      failed ||= !ok;
    } catch {
      failed = true;
      console.log(`FAIL ${endpoint}: API could not be reached`);
    }
  }
  if (failed) console.error('Deploy the matching backend release and verify the API/proxy routes before rebuilding the app.');
  process.exitCode = failed ? 1 : 0;
}
void check();
