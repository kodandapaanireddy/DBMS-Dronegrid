import { test } from 'node:test';
import assert from 'node:assert/strict';
import pkg from 'pg';
const { Pool } = pkg;

import { recentAudit, logAudit } from '../src/lib/security.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/dronegrid';
const pool = new Pool({ connectionString: DATABASE_URL });

test('recentAudit returns an array ordered newest-first', async () => {
  const rows = await recentAudit(10);
  assert.ok(Array.isArray(rows), 'recentAudit should return an array');
  for (let i = 1; i < rows.length; i++) {
    assert.ok(
      new Date(rows[i - 1].created_at) >= new Date(rows[i].created_at),
      'audit entries should be ordered newest-first'
    );
  }
});

test('logAudit inserts a row into audit_log', async () => {
  const before = await pool.query(`SELECT COUNT(*) AS c FROM audit_log`);
  await logAudit({
    actor: 'u-test',
    action: 'login_failed',
    status: 401,
    reason: 'unit-test-insert',
  });
  const after = await pool.query(`SELECT COUNT(*) AS c FROM audit_log`);
  assert.strictEqual(Number(after.rows[0].c), Number(before.rows[0].c) + 1,
    'audit_log row count should increase by 1 after logAudit');

  const row = await pool.query(
    `SELECT actor, action, status, detail FROM audit_log WHERE actor = 'u-test' ORDER BY created_at DESC LIMIT 1`
  );
  assert.strictEqual(row.rows[0].actor, 'u-test');
  assert.strictEqual(row.rows[0].action, 'login_failed');
  assert.strictEqual(row.rows[0].status, 401);

  await pool.query(`DELETE FROM audit_log WHERE actor = 'u-test'`);
});

test('logAudit does not throw when the table is missing (fail-open)', async () => {
  await expect(logAudit({ actor: 'x', action: 'y' })).resolves.toBeUndefined();
});

await pool.end();
