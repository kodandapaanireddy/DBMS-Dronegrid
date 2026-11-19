import { getTokenFromCookie, verifyToken, jsonError, jsonOk } from '@/lib/auth';
import { query } from '@/lib/db';
import { validate } from '@/lib/schemas';
import { repairDroneSchema } from '@/lib/schemas';

/**
 * POST /api/fleet/repair
 * Body: { drone_id, battery_pct? }
 * Admin action: Maintenance → Idle with battery reset.
 */
export async function POST(request) {
  const token = getTokenFromCookie(request.headers.get('cookie'));
  const payload = token ? verifyToken(token) : null;
  if (!payload) return jsonError(401, 'Not authenticated');
  if (payload.role !== 'grid_admin') return jsonError(403, 'Forbidden');

  const body = await request.json().catch(() => null);
  const v = validate(body, repairDroneSchema);
  if (!v.ok) return jsonError(400, 'Validation failed', v.errors);

  try {
    await query('SELECT repair_drone($1, $2)', [v.data.drone_id, v.data.battery_pct]);
    return jsonOk({ ok: true, drone_id: v.data.drone_id, battery_pct: v.data.battery_pct });
  } catch (err) {
    return jsonError(422, err.message);
  }
}