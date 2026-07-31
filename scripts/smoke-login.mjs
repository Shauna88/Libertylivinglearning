/**
 * Login smoke test — the CI "login blocker".
 *
 * Boots against a running instance (a real Postgres behind it) and proves the
 * whole sign-in path works end to end: the app is reachable and seeded, the
 * Auth.js credentials flow issues a session, and that session resolves to the
 * expected user. A 5xx on the credentials callback is the exact signature of
 * the production login blocker (missing AUTH_SECRET / broken auth wiring), so
 * this fails the build before such a regression can ship.
 *
 * No test framework — plain Node 20 (global fetch, manual cookie jar). Run:
 *   node scripts/smoke-login.mjs
 * Configurable via env: SMOKE_BASE_URL, SMOKE_EMAIL, SMOKE_PASSWORD.
 */

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL || "csm@libertyhomecare.ie";
const PASSWORD = process.env.SMOKE_PASSWORD || "libertylevi";
const READY_TIMEOUT_MS = 120_000;

const jar = new Map();

function storeCookies(res) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const pair = raw.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value === "") jar.delete(name);
    else jar.set(name, value);
  }
}

async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (jar.size) headers.cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(BASE + path, { ...opts, headers, redirect: "manual" });
  storeCookies(res);
  return res;
}

function pass(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Wait until the app is reachable and seeded (first hit triggers the seed).
let health = null;
const deadline = Date.now() + READY_TIMEOUT_MS;
while (Date.now() < deadline) {
  try {
    const res = await req("/api/health");
    if (res.status === 200) {
      const body = await res.json();
      if (body.status === "ok" && body.seeded) {
        health = body;
        break;
      }
      health = body; // keep last for the error message
    }
  } catch {
    // server not up yet — keep polling
  }
  await sleep(2000);
}
if (!health || health.status !== "ok" || !health.seeded) {
  fail(`/api/health never became ok+seeded within ${READY_TIMEOUT_MS / 1000}s (last: ${JSON.stringify(health)})`);
}
pass(`app healthy — ${health.users} users, ${health.courses} courses seeded`);

// 2. Get a CSRF token (and its cookie).
const csrfRes = await req("/api/auth/csrf");
if (csrfRes.status !== 200) fail(`/api/auth/csrf returned ${csrfRes.status}`);
const { csrfToken } = await csrfRes.json();
if (!csrfToken) fail("no csrfToken returned from /api/auth/csrf");
pass("obtained CSRF token");

// 3. Sign in with the Credentials provider.
const form = new URLSearchParams({
  csrfToken,
  email: EMAIL,
  password: PASSWORD,
  callbackUrl: `${BASE}/dashboard`,
  json: "true",
});
const loginRes = await req("/api/auth/callback/credentials", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: form.toString(),
});
if (loginRes.status >= 500) {
  const body = await loginRes.text().catch(() => "");
  fail(`login callback returned ${loginRes.status} — the login-blocker signature (check AUTH_SECRET / auth wiring). Body: ${body.slice(0, 300)}`);
}
const hasSession = [...jar.keys()].some((k) => k.includes("session-token"));
if (!hasSession) {
  const body = await loginRes.text().catch(() => "");
  fail(`no session cookie after sign-in (status ${loginRes.status}). Wrong credentials or broken authorize? Body: ${body.slice(0, 300)}`);
}
pass("credentials sign-in issued a session cookie");

// 4. The session resolves to the expected user.
const sessRes = await req("/api/auth/session");
const session = await sessRes.json().catch(() => ({}));
if (!session?.user?.email) fail(`/api/auth/session has no authenticated user (${JSON.stringify(session)})`);
if (session.user.email.toLowerCase() !== EMAIL.toLowerCase()) {
  fail(`session is for the wrong user: ${session.user.email}`);
}
pass(`authenticated as ${session.user.email} (${session.user.role})`);

console.log("\nLogin smoke test passed — sign-in works end to end.");
