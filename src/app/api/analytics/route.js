import { getTokenFromCookie, verifyToken, jsonError, jsonOk } from '@/lib/auth';
import { getMongo } from '@/lib/mongo';
import {
  avgDeliveryTimePerZone,
  weatherInterferencePerZone,
  batteryDrainPerZoneHour,
} from '../../../../db/mongo/aggregations.js';

/**
 * GET /api/analytics
 * Query params:
 *   ?pipeline=avg_delivery_time_per_zone
 *   ?pipeline=weather_interference_per_zone
 *   ?pipeline=battery_drain_per_zone_hour
 * Admin only.
 */
export async function GET(request) {
  const token = getTokenFromCookie(request.headers.get('cookie'));
  const payload = token ? verifyToken(token) : null;
  if (!payload) return jsonError(401, 'Not authenticated');
  if (payload.role !== 'grid_admin') return jsonError(403, 'Forbidden');

  const { searchParams } = new URL(request.url);
  const pipelineName = searchParams.get('pipeline') || 'avg_delivery_time_per_zone';

  const pipelines = {
    avg_delivery_time_per_zone: avgDeliveryTimePerZone,
    weather_interference_per_zone: weatherInterferencePerZone,
    battery_drain_per_zone_hour: batteryDrainPerZoneHour,
  };

  const pipelineFn = pipelines[pipelineName];
  if (!pipelineFn) {
    return jsonError(400, 'Unknown pipeline', { available: Object.keys(pipelines) });
  }

  try {
    const db = await getMongo();
    const collection = pipelineName.includes('battery') ? 'telemetry' : 'delivery_events';
    const rows = await db.collection(collection).aggregate(pipelineFn()).toArray();
    return jsonOk({ pipeline: pipelineName, rows });
  } catch (err) {
    return jsonError(500, err.message);
  }
}