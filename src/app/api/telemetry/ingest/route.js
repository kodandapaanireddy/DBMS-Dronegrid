import { getTokenFromCookie, verifyToken, jsonError, jsonOk } from '@/lib/auth';
import { getMongo } from '@/lib/mongo';
import { query } from '@/lib/db';
import { validate } from '@/lib/schemas';
import { telemetryIngestSchema } from '@/lib/schemas';

// Allow large telemetry batches
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/telemetry/ingest
 * Auth: Bearer TELEMETRY_API_KEY header OR a JWT with grid_admin role.
 * Body: { points: [{ drone_id, zone_id, location, battery_pct, temperature_c, signal_strength, ts? }] }
 *
 * 1. Inserts telemetry into MongoDB (batched).
 * 2. Throttles Postgres sync: updates drones.battery_pct / last_seen_at
 *    only once per 5 seconds per drone.
 */
export async function POST(request) {
  const apiKey = request.headers.get('x-api-key');
  const token = getTokenFromCookie(request.headers.get('cookie'));
  const payload = token ? verifyToken(token) : null;

  const validKey = process.env.TELEMETRY_API_KEY || 'dronegrid-telemetry-key-2024';
  const authorized = (apiKey && apiKey === validKey) || (payload && payload.role === 'grid_admin');
  if (!authorized) return jsonError(401, 'Unauthorized');

  const body = await request.json().catch(() => null);
  const v = validate(body, telemetryIngestSchema);
  if (!v.ok) return jsonError(400, 'Validation failed', v.errors);

  const { points } = v.data;
  const db = await getMongo();

  // 1. Insert telemetry into MongoDB
  const docs = points.map((p) => ({
    ts: p.ts ? new Date(p.ts) : new Date(),
    meta: { drone_id: p.drone_id, zone_id: p.zone_id },
    location: p.location,
    altitude_m: p.altitude_m ?? 50,
    speed_mps: p.speed_mps ?? 5,
    battery_pct: p.battery_pct,
    temperature_c: p.temperature_c,
    signal_strength: p.signal_strength,
  }));

  let inserted = 0;
  if (docs.length > 0) {
    const res = await db.collection('telemetry').insertMany(docs, { ordered: false });
    inserted = res.insertedCount;
  }

  // 2. Throttled Postgres sync: only update drones if the last sync was >5s ago.
  //    We use a simple in-process map keyed by drone_id.
  const now = Date.now();
  const toUpdate = points.filter((p) => now - (lastSync.get(p.drone_id) || 0) > 5_000);
  for (const p of toUpdate) {
    lastSync.set(p.drone_id, now);
    try {
      await query(
        `UPDATE drones SET battery_pct = $1, last_seen_at = $2 WHERE drone_id = $3`,
        [p.battery_pct, new Date(), p.drone_id]
      );
    } catch (_e) {
      // ignore per-point sync errors (e.g. drone deleted)
    }
  }

  return jsonOk({ inserted, synced: toUpdate.length, total: points.length });
}

// In-process throttle map (drone_id -> last sync ms)
const lastSync = new Map();