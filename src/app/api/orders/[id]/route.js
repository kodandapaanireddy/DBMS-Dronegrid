import { getTokenFromCookie, verifyToken, jsonError, jsonOk } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/orders/:id
 * Customers may only view their own orders. Admins may view any.
 */
export async function GET(request, { params }) {
  const token = getTokenFromCookie(request.headers.get('cookie'));
  const payload = token ? verifyToken(token) : null;
  if (!payload) return jsonError(401, 'Not authenticated');

  const orderId = Number(params.id);
  if (!Number.isFinite(orderId)) return jsonError(400, 'Invalid order id');

  const result = await query(
    `SELECT o.order_id, o.customer_id, o.drone_id, o.pickup_lat, o.pickup_lng,
            o.dropoff_lat, o.dropoff_lng, o.zone_id, o.weight_kg, o.status,
            o.created_at, o.delivered_at,
            p.payment_id, p.amount, p.currency, p.status AS payment_status, p.method,
            i.invoice_id, i.total AS invoice_total, i.tax AS invoice_tax
     FROM orders o
     LEFT JOIN payments p ON p.order_id = o.order_id
     LEFT JOIN invoices i ON i.order_id = o.order_id
     WHERE o.order_id = $1`,
    [orderId]
  );

  if (result.rows.length === 0) return jsonError(404, 'Order not found');
  const order = result.rows[0];

  // Authorization: customer can only see their own order
  if (payload.role !== 'grid_admin' && order.customer_id !== payload.userId) {
    return jsonError(403, 'Forbidden');
  }

  return jsonOk({ order });
}