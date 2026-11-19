import { getTokenFromCookie, verifyToken, jsonError, jsonOk } from '@/lib/auth';
import { getMongo } from '@/lib/mongo';

/**
 * POST /api/telemetry/by-drone
 * Body: { drone_id, limit? }
 * Returns recent telemetry points for a drone (used by tracking UI).
 */
export async function POST(request) {
  const token = getTokenFromCookie(request.headers.get('cookie'));
  const payload = token ? verifyToken(token) : null;
  if (!payload) return jsonError(401, 'Not authenticated');

  const body = await request.json().catch(() => null);
  const drone_id = body?.drone_id;
  const limit = Math.min(Number(body?.limit) || 50, 500);
  if (!drone_id) return jsonError(400, 'drone_id required');

  const db = await getMongo();
  const rows = await db
    .collection('telemetry')
    .find({ 'meta.drone_id': drone_id })
    .sort({ ts: -1 })
    .limit(limit)
    .toArray();

  return jsonOk({ points: rows.map((r) => ({ ...r, _id: undefined })) });
}