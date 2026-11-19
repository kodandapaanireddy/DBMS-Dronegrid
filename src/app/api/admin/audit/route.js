import { getTokenFromCookie, verifyToken, jsonError, jsonOk } from '@/lib/auth';
import { recentAudit } from '@/lib/security';

/**
 * GET /api/admin/audit
 * Recent audit trail for the admin dashboard.
 * Returns the last 100 entries ordered newest first.
 */
export async function GET(request) {
  const token = getTokenFromCookie(request.headers.get('cookie'));
  const payload = token ? verifyToken(token) : null;
  if (!payload) return jsonError(401, 'Not authenticated');
  if (payload.role !== 'grid_admin') return jsonError(403, 'Forbidden');

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 100, 500);
  const rows = await listRecent(limit);
  return jsonOk({ entries: rows });
}
