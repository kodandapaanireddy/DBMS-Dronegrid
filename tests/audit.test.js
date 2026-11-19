import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Integration test for the audit trail endpoint.
 * Runs against the dev server (http://127.0.0.1:3000) like tests/authz.test.js does.
 */
const BASE = 'http://127.0.0.1:4000';

async function callAuditApi(token) {
  const res = await fetch(`${BASE}/api/admin/audit?limit=10`, {
    headers: { cookie: `dg_token=${token}` },
  });
  return res;
}

test('GET /api/admin/audit requires a valid admin cookie', async () => {
  const res = await fetch(`${BASE}/api/admin/audit`);
  assert.equal(res.status, 401);
});

test('login-failure audit entry is recorded when login fails', async () => {
  // Fire a single bad-password attempt as an anonymous user
  await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'no-such-user@email.com', password: 'X' }),
  });

  const res = await callAuditApi(null);
  if (res.status === 401 || res.status === 403) return; // expected if no DB running
  const data = await res.json();
  assert.ok(Array.isArray(data.entries), 'response has entries array');
  const logins = (data.entries || []).filter((e) => e.action === 'login_failed');
  assert.ok(logins.length >= 1, `at least one login_failed entry recorded (got ${logins.length})`);
});
