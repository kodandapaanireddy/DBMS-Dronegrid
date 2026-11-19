import { getTokenFromCookie, verifyToken, jsonError, jsonOk } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/orders/list
 * Customers see only their own orders. Admins see all.
 */
export async function GET(request) {
  const token = getTokenFromCookie(request.headers.get('cookie'));
  const payload = token ? verifyToken(token) : null;
  if (!payload) return jsonError(401, 'Not authenticated');

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

  let sql, params;
  if (payload.role === 'grid_admin') {
    sql = `SELECT o.order_id, o.customer_id, o.drone_id, o.status, o.weight_kg,
                  o.created_at, o.delivered_at, p.amount, p.status AS payment_status
           FROM orders o
           LEFT JOIN payments p ON p.order_id = o.order_id
           ORDER BY o.created_at DESC
           LIMIT $1`;
    params = [limit];
  } else {
    sql = `SELECT o.order_id, o.customer_id, o.drone_id, o.status, o.weight_kg,
                  o.created_at, o.delivered_at, p.amount, p.status AS payment_status
           FROM orders o
           LEFT JOIN payments p ON p.order_id = o.order_id
           WHERE o.customer_id = $1
           ORDER BY o.created_at DESC
           LIMIT $2`;
    params = [payload.userId, limit];
  }

  const result = await query(sql, params);
  return jsonOk({ orders: result.rows });
}