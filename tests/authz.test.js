import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'http://127.0.0.1:4000';

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.ok(res.ok, `login ${email} should succeed`);
  const cookie = res.headers.get('set-cookie') || '';
  const match = cookie.match(/dg_token=([^;]+)/);
  return match ? match[1] : null;
}

test('customer cannot access admin routes', async (t) => {
  const token = await login('rahul.sharma@email.com', 'Customer@123');
  assert.ok(token, 'got customer token');

  const res = await fetch(`${BASE}/api/fleet/active`, {
    headers: { cookie: `dg_token=${token}` },
  });
  assert.strictEqual(res.status, 403, 'customer should get 403 on admin fleet endpoint');
});

test('customer cannot see another customer\'s orders', async (t) => {
  const token = await login('rahul.sharma@email.com', 'Customer@123');
  assert.ok(token);

  // Get rahul's orders
  const myRes = await fetch(`${BASE}/api/orders/list`, {
    headers: { cookie: `dg_token=${token}` },
  });
  assert.ok(myRes.ok);
  const myData = await myRes.json();

  // Try to fetch a specific order that belongs to another customer (priya, user_id likely 3)
  // We iterate through a few order ids and ensure none of another customer is visible.
  // Simpler: admin should see all, customer sees only own.
  const adminToken = await login('admin@dronegrid.in', 'Admin@123');
  assert.ok(adminToken);

  const adminRes = await fetch(`${BASE}/api/orders/list`, {
    headers: { cookie: `dg_token=${adminToken}` },
  });
  assert.ok(adminRes.ok);
  const adminData = await adminRes.json();

  // Admin should see >= customer's count (admin sees everything)
  assert.ok(adminData.orders.length >= myData.orders.length,
    'admin sees at least as many orders as a customer');

  // Every customer order must belong to rahul
  const rahulIds = await fetch(`${BASE}/api/auth/me`, { headers: { cookie: `dg_token=${token}` } }).then(r => r.json());
  const myUserId = rahulIds.user.user_id;
  for (const o of myData.orders) {
    assert.strictEqual(o.customer_id, myUserId, `order ${o.order_id} belongs to rahul`);
  }
});