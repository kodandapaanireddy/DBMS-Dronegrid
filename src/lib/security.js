import { query } from './db';

/**
 * Write an audit log entry.
 * @param {object} entry - { actor, action, status?, reason? }
 */
export async function logAudit(entry) {
  try {
    await query(
      `INSERT INTO audit_log (actor, action, resource, status, detail)
       VALUES ($1, $2, '', $3, $4)`,
      [entry.actor || 'system', entry.action, entry.status || null, entry.detail || '']
    );
  } catch (e) {
    // Audit failures must not break the request flow.
    console.error('[audit] failed to write:', e.message);
  }
}

/**
 * List recent audit entries (admin view).
 */
export async function recentAudit(limit = 50) {
  const r = await query(
    `SELECT actor, action, resource, status, detail, created_at
     FROM audit_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return r.rows;
}
