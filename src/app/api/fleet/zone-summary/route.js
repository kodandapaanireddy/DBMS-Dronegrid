import { getTokenFromCookie, verifyToken, jsonError, jsonOk } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/fleet/zone-summary
 * Drone counts by status per zone. Admin only.
 */
export async function GET(request) {
  const token = getTokenFromCookie(request.headers.get('cookie'));
  const payload = token ? verifyToken(token) : null;
  if (!payload) return jsonError(401, 'Not authenticated');
  if (payload.role !== 'grid_admin') return jsonError(403, 'Forbidden');

  const result = await query('SELECT * FROM zone_fleet_summary_view ORDER BY zone_code');
  return jsonOk({ zones: result.rows });
}