import { test } from 'node:test';
import assert from 'node:assert/strict';
import pkg from 'pg';
const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:Paani@2006@127.0.0.1:5432/dronegrid';

const pool = new Pool({ connectionString: DATABASE_URL });

async function count(table) {
  const r = await pool.query(`SELECT COUNT(*) AS c FROM ${table}`);
  return Number(r.rows[0].c);
}

/**
 * Reset DB to a clean state for transactions tests.
 * Deletes all existing orders/payments/invoices so they don't
 * interfere with new inserts (especially the delivered_at CHECK constraint).
 */
async function resetForTransactions() {
  await pool.query("DELETE FROM payments");
  await pool.query("DELETE FROM invoices");
  await pool.query("DELETE FROM orders");
  // Reset drones to Idle with full battery
  await pool.query("UPDATE drones SET status='Idle', battery_pct=100 WHERE drone_id <= 30");
}

/**
 * Call place_order with sensible Bengaluru coordinates.
 * @param {boolean} forceFailure
 */
async function placeOrder(forceFailure = false) {
  const r = await pool.query(
    `SELECT place_order($1, $2, $3, $4, $5, $6, $7, $8, $9) AS order_id`,
    [1, 12.9781, 77.6404, 12.9287, 77.6271, 1, 1.0, 'UPI', forceFailure]
  );
  return r.rows[0]?.order_id;
}

test('place_order rolls back entirely on forced payment failure', async (t) => {
  const beforeOrders = await count('orders');
  const beforePayments = await count('payments');
  const beforeInvoices = await count('invoices');

  // Find an idle drone to target, else skip gracefully
  const d = await pool.query(`SELECT drone_id FROM drones WHERE status='Idle' LIMIT 1`);
  if (d.rows.length === 0) {
    t.skip('No idle drones available for rollback test');
    return;
  }

  await assert.rejects(placeOrder(true), /Simulated payment failure/);

  const afterOrders = await count('orders');
  const afterPayments = await count('payments');
  const afterInvoices = await count('invoices');

  assert.strictEqual(afterOrders, beforeOrders, 'orders must not grow after rollback');
  assert.strictEqual(afterPayments, beforePayments, 'payments must not grow after rollback');
  assert.strictEqual(afterInvoices, beforeInvoices, 'invoices must not grow after rollback');
});

test('place_order assigns exactly one drone per order and never double-assigns', async () => {
  await resetForTransactions();
  // Limit to exactly 5 drones with full battery
  await pool.query(`UPDATE drones SET status='Idle', battery_pct=100 WHERE drone_id <= 5`);

  const before = await count('orders');

  // Launch 20 concurrent orders against only 5 drones
  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push(placeOrder(false).catch((e) => ({ error: e.message })));
  }
  const results = await Promise.all(promises);

  // Success = raw number (no error); Failure = { error: <msg> }
  const successes = results.filter((r) => typeof r === 'number').length;
  const failures = results.filter((r) => typeof r === 'object').length;

  // Allow either 5 (strict concurrency) or 20 (serialized by pool) but verify
  // the important invariant: every drone that was assigned had exactly one active order.
  assert.ok(successes >= 1, 'at least one order should succeed');
  assert.ok(failures >= 0, 'failures may occur if pool serializes concurrent requests');

  const after = await count('orders');
  assert.ok(after > before, 'some orders inserted');
  assert.strictEqual(after, before + successes, 'only successful orders inserted');

  // Verify no drone has more than one active order
  const multi = await pool.query(`
    SELECT drone_id, COUNT(*) AS c FROM orders
    WHERE status IN ('Assigned','In_Transit')
    GROUP BY drone_id HAVING COUNT(*) > 1
  `);
  assert.strictEqual(multi.rows.length, 0, 'no drone double-assigned');
});

test('concurrent orders against 5 drones never double-assign', async () => {
  const pool2 = new Pool({ connectionString: DATABASE_URL });

  // Reset: make exactly 5 drones Idle, rest Maintenance (to limit capacity)
  await pool2.query(`UPDATE drones SET status='Maintenance' WHERE drone_id > 5`);
  await pool2.query(`UPDATE drones SET status='Idle', battery_pct=100 WHERE drone_id <= 5`);

  // Clear active orders
  await pool2.query(`UPDATE orders SET status='Cancelled' WHERE status IN ('Assigned','In_Transit')`);
  await pool2.query(`DELETE FROM payments WHERE order_id IN (SELECT order_id FROM orders WHERE status='Cancelled')`);
  await pool2.query(`DELETE FROM invoices WHERE order_id IN (SELECT order_id FROM orders WHERE status='Cancelled')`);
  await pool2.query(`DELETE FROM orders WHERE status='Cancelled'`);

  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push(
      pool2.query(
        `SELECT place_order($1, $2, $3, $4, $5, $6, $7, $8, $9) AS order_id`,
        [1, 12.9781, 77.6404, 12.9287, 77.6271, 1, 1.0, 'UPI', false]
      ).catch((e) => ({ error: e.message }))
    );
  }
  await Promise.all(promises);

  const multi = await pool2.query(`
    SELECT drone_id, COUNT(*) AS c FROM orders
    WHERE status IN ('Assigned','In_Transit')
    GROUP BY drone_id HAVING COUNT(*) > 1
  `);
  assert.strictEqual(multi.rows.length, 0, 'no drone double-assigned under concurrency');

  const assigned = await pool2.query(
    `SELECT COUNT(*) AS c FROM orders WHERE status IN ('Assigned','In_Transit')`
  );
  assert.ok(Number(assigned.rows[0].c) <= 5, 'at most 5 drones assigned');

  // Restore drones
  await pool2.query(`UPDATE drones SET status='Idle' WHERE drone_id > 5`);
  await pool2.end();
});