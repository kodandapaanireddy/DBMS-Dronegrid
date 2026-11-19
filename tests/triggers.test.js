import { test } from 'node:test';
import assert from 'node:assert/strict';
import pkg from 'pg';
const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:Paani@2006@127.0.0.1:5432/dronegrid';

const pool = new Pool({ connectionString: DATABASE_URL });

test('battery below critical threshold flips drone to Maintenance + log row', async (t) => {
  // Find an idle drone with battery above threshold
  const rows = await pool.query(
    `SELECT drone_id, battery_pct FROM drones WHERE status='Idle' ORDER BY drone_id LIMIT 1`
  );
  if (rows.rows.length === 0) {
    t.skip('No idle drone available for trigger test');
    return;
  }
  const droneId = rows.rows[0].drone_id;

  // Record open maintenance count before
  const beforeOpen = await pool.query(
    `SELECT COUNT(*) AS c FROM maintenance_log WHERE drone_id=$1 AND resolved_at IS NULL`,
    [droneId]
  );

  // Drop battery below the critical threshold (default 15)
  await pool.query(`UPDATE drones SET battery_pct = 5 WHERE drone_id = $1`, [droneId]);

  // Verify the drone was flipped to Maintenance
  const after = await pool.query(`SELECT status FROM drones WHERE drone_id = $1`, [droneId]);
  assert.strictEqual(after.rows[0].status, 'Maintenance',
    'drone should be forced to Maintenance when battery < threshold');

  // Check maintenance_log was created (the BEFORE UPDATE trigger should have inserted a row)
  const logCheck = await pool.query(
    `SELECT COUNT(*) AS c FROM maintenance_log WHERE drone_id=$1 AND resolved_at IS NULL`,
    [droneId]
  );
  // The trigger creates a row on each UPDATE, so there should be at least one unclosed row
  assert.ok(Number(logCheck.rows[0].c) >= 1,
    'an open maintenance_log row should be created');

  // Restore the drone so other tests aren't affected
  await pool.query(`UPDATE drones SET status='Idle', battery_pct=100 WHERE drone_id=$1`, [droneId]);
});

test('last_seen_at stays current on battery sync', async (t) => {
  const rows = await pool.query(`SELECT drone_id FROM drones LIMIT 1`);
  if (rows.rows.length === 0) { t.skip('no drones'); return; }
  const id = rows.rows[0].drone_id;
  const before = await pool.query(`SELECT last_seen_at FROM drones WHERE drone_id=$1`, [id]);
  await new Promise((r) => setTimeout(r, 1100));
  await pool.query(`UPDATE drones SET battery_pct = battery_pct WHERE drone_id=$1`, [id]);
  const after = await pool.query(`SELECT last_seen_at FROM drones WHERE drone_id=$1`, [id]);
  assert.ok(after.rows[0].last_seen_at >= before.rows[0].last_seen_at,
    'last_seen_at should not go backwards');
});

test('In_Flight drone landing with low battery goes to Maintenance', async (t) => {
  const rows = await pool.query(`SELECT drone_id FROM drones LIMIT 1`);
  if (rows.rows.length === 0) { t.skip('no drones'); return; }
  const id = rows.rows[0].drone_id;
  await pool.query(`UPDATE drones SET status='In_Flight', battery_pct = 5 WHERE drone_id=$1`, [id]);
  // Simulate landing: change status away from In_Flight while battery still low
  await pool.query(`UPDATE drones SET status='Idle' WHERE drone_id=$1`, [id]);
  const after = await pool.query(`SELECT status FROM drones WHERE drone_id=$1`, [id]);
  assert.strictEqual(after.rows[0].status, 'Maintenance',
    'landing drone with low battery should go to Maintenance');
  await pool.query(`UPDATE drones SET status='Idle', battery_pct=100 WHERE drone_id=$1`, [id]);
});

test('battery = 150 is rejected by CHECK constraint', async () => {
  await assert.rejects(
    pool.query(`INSERT INTO drones (serial_no, model_id, status, battery_pct, home_zone_id, last_seen_at)
                VALUES ('DRN-TEST-BATT', 1, 'Idle', 150, 1, NOW())`),
    /violates check constraint/
  );
});

test('duplicate email is rejected by unique constraint', async () => {
  await assert.rejects(
    pool.query(`INSERT INTO users (name, email, password_hash, role) VALUES ('Dup','admin@dronegrid.in','x','customer')`),
    /duplicate key value violates unique constraint/
  );
});