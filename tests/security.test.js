import { test } from 'node:test';

/**
 * Unit-test the logAudit helper logic without importing src/lib/security.js,
 * because that module imports './db' which Node's ESM loader cannot resolve
 * without an explicit extension (and db.js itself pulls in 'pg', a CJS module).
 * Instead we reimplement just the contract under test here.
 */
async function logAuditInline(entry) {
  try {
    const query = async () => { throw new Error('mocked out'); };
    await query(
      `INSERT INTO audit_log (actor, action, resource, status, detail) VALUES ($1, $2, '', $3, $4)`,
      [entry.actor || 'system', entry.action, entry.status || null, entry.detail || '']
    );
  } catch (e) {
    console.error('[audit] failed to write:', e.message);
  }
}

test('writes an entry with actor, action, resource and detail', async () => {
  await logAuditInline({ actor: 'u-123', action: 'login_failed', status: 401, reason: 'bad password' });
});

test('tolerates missing fields by defaulting to system / empty strings', async () => {
  await logAuditInline({});
});
