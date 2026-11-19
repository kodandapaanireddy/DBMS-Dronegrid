import { query } from '@/lib/db';
import { getMongo } from '@/lib/mongo';
import { jsonOk, jsonError } from '@/lib/schemas';

/**
 * GET /api/health
 * Returns Postgres + Mongo connectivity and latency.
 */
export async function GET() {
  const health = { postgres: null, mongo: null, ok: false };

  // Postgres ping
  const pgStart = Date.now();
  try {
    await query('SELECT 1 AS ok');
    health.postgres = { ok: true, latency_ms: Date.now() - pgStart };
  } catch (err) {
    health.postgres = { ok: false, error: err.message };
  }

  // Mongo ping
  const mgStart = Date.now();
  try {
    const db = await getMongo();
    await db.admin().ping();
    health.mongo = { ok: true, latency_ms: Date.now() - mgStart };
  } catch (err) {
    health.mongo = { ok: false, error: err.message };
  }

  health.ok = health.postgres.ok && health.mongo.ok;
  return jsonOk(health, health.ok ? 200 : 503);
}