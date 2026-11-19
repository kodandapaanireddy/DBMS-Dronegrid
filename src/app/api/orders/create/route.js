import { getTokenFromCookie, verifyToken, jsonError, jsonOk } from '@/lib/auth';
import { query, client } from '@/lib/db';
import { validate } from '@/lib/schemas';
import { createOrderSchema } from '@/lib/schemas';

/**
 * POST /api/orders/create
 * Body: { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, zone_id, weight_kg, method, force_failure? }
 *
 * Calls the atomic `place_order()` PL/pgSQL function. If force_failure is true
 * the transaction rolls back and no rows are persisted.
 */
export async function POST(request) {
  const token = getTokenFromCookie(request.headers.get('cookie'));
  const payload = token ? verifyToken(token) : null;
  if (!payload) return jsonError(401, 'Not authenticated');

  const body = await request.json().catch(() => null);
  const v = validate(body, createOrderSchema);
  if (!v.ok) return jsonError(400, 'Validation failed', v.errors);

  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, zone_id, weight_kg, method, force_failure } = v.data;

  try {
    const result = await query(
      `SELECT place_order($1, $2, $3, $4, $5, $6, $7, $8, $9) AS order_id`,
      [payload.userId, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, zone_id, weight_kg, method, force_failure]
    );
    return jsonOk({ order_id: result.rows[0].order_id, force_failure });
  } catch (err) {
    // A forced failure is expected — return 409 with the message.
    if (force_failure) {
      return jsonError(409, 'Payment failed (simulated) — order rolled back', { rolled_back: true });
    }
    return jsonError(422, err.message);
  }
}