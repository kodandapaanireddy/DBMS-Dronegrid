import { getTokenFromCookie, verifyToken, jsonError, jsonOk } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/fleet/active
 * Returns the active fleet view (drone_id, serial, model, status, battery,
 * home zone, current order, last_seen, health). Admin only.
 */
export async function GET(request) {
  const token = getTokenFromCookie(request.headers.get('cookie'));
  const payload = token ? verifyToken(token) : null;
  if (!payload) return jsonError(401, 'Not authenticated');
  if (payload.role !== 'grid_admin') return jsonError(403, 'Forbidden');

  const result = await query('SELECT * FROM active_fleet_view ORDER BY drone_id');
  return jsonOk({ fleet: result.rows });
}