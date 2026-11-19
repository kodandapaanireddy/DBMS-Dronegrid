import { getTokenFromCookie, verifyToken, jsonOk, jsonError } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
export async function GET(request) {
  const token = getTokenFromCookie(request.headers.get('cookie'));
  const payload = token ? verifyToken(token) : null;
  if (!payload) return jsonError(401, 'Not authenticated');

  const result = await query(
    'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = $1',
    [payload.userId]
  );
  if (result.rows.length === 0) return jsonError(404, 'User not found');
  return jsonOk({ user: result.rows[0] });
}