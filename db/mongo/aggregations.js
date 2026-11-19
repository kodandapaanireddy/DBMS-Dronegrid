// =============================================================================
// Urban Drone Logistics DBMS — MongoDB Aggregations (Phase 4)
// =============================================================================
// Run:   MONGO_URL="mongodb://mongo:mongo@localhost:27017/dronegrid"
//        node db/mongo/aggregations.js
//
// Each function returns a named, reusable pipeline. The Next.js API exposes
// these at /api/analytics/*.
// =============================================================================

import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:mongo@localhost:27017/dronegrid';

/**
 * 1. Average delivery time per 3 km grid zone.
 *    Joins delivery_events (zone_id) with grid_zones (zone_code).
 */
export function avgDeliveryTimePerZone() {
  return [
    {
      $group: {
        _id: '$zone_id',
        avgDurationSec: { $avg: '$duration_sec' },
        maxDurationSec: { $max: '$duration_sec' },
        deliveryCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'grid_zones',
        localField: '_id',
        foreignField: 'zone_code',
        as: 'zone',
      },
    },
    {
      $addFields: {
        zoneName: { $ifNull: [{ $arrayElemAt: ['$zone.name', 0] }, 'Unknown'] },
        avgDurationMin: { $round: [{ $divide: ['$avgDurationSec', 60] }, 1] },
      },
    },
    { $sort: { avgDurationSec: -1 } },
  ];
}

/**
 * 2. Weather interference per zone — correlation between wind_speed and
 *    delivery duration / path deviation, grouped by zone.
 */
export function weatherInterferencePerZone() {
  return [
    {
      $group: {
        _id: '$zone_id',
        avgWind: { $avg: '$wind_speed_at_delivery' },
        maxWind: { $max: '$wind_speed_at_delivery' },
        avgDurationSec: { $avg: '$duration_sec' },
        maxDurationSec: { $max: '$duration_sec' },
        avgDeviationM: { $avg: '$deviation_m' },
        maxDeviationM: { $max: '$deviation_m' },
        deliveryCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'grid_zones',
        localField: '_id',
        foreignField: 'zone_code',
        as: 'zone',
      },
    },
    {
      $addFields: {
        zoneName: { $ifNull: [{ $arrayElemAt: ['$zone.name', 0] }, 'Unknown'] },
        // Simple interference score: 0-100, weighted by wind + deviation
        interferenceScore: {
          $min: [
            100,
            {
              $add: [
                { $multiply: ['$avgWind', 2] },
                { $multiply: ['$avgDeviationM', 0.2] },
              ],
            },
          ],
        },
      },
    },
    { $sort: { interferenceScore: -1 } },
  ];
}

/**
 * 3. Zone-level telemetry rollups — average battery drain rate per zone and
 *    per hour (using $facet to compute both simultaneously).
 */
export function batteryDrainPerZoneHour() {
  return [
    {
      $facet: {
        byZone: [
          {
            $group: {
              _id: '$meta.zone_id',
              avgBattery: { $avg: '$battery_pct' },
              minBattery: { $min: '$battery_pct' },
              maxBattery: { $max: '$battery_pct' },
              sampleCount: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: 'grid_zones',
              localField: '_id',
              foreignField: 'zone_code',
              as: 'zone',
            },
          },
          {
            $addFields: {
              zoneName: { $ifNull: [{ $arrayElemAt: ['$zone.name', 0] }, 'Unknown'] },
            },
          },
          { $sort: { avgBattery: 1 } },
        ],
        byHour: [
          {
            $project: {
              hour: {
                $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$ts' },
              },
              battery: '$battery_pct',
              zoneId: '$meta.zone_id',
            },
          },
          {
            $group: {
              _id: { hour: '$hour', zoneId: '$zoneId' },
              avgBattery: { $avg: '$battery' },
              minBattery: { $min: '$battery' },
              sampleCount: { $sum: 1 },
            },
          },
          { $sort: { '_id.hour': 1 } },
        ],
      },
    },
  ];
}

/**
 * 4. Geo-nearest drones — for a given lat/lng, find the nearest active
 *    drone using $geoWithin + $geoNear-style proximity.
 */
export function nearestDronesToLocation(lng, lat, limit = 5) {
  return [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distance_m',
        spherical: true,
        query: { 'meta.drone_id': { $exists: true } },
        limit,
      },
    },
    {
      $project: {
        drone_id: '$meta.drone_id',
        zone_id: '$meta.zone_id',
        location: 1,
        battery_pct: 1,
        distance_m: 1,
      },
    },
    { $sort: { distance_m: 1 } },
  ];
}

// ---------------------------------------------------------------------------
// Run all pipelines and print results (when executed directly)
// ---------------------------------------------------------------------------
async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db();

  console.log('=== 1. Avg delivery time per zone ===');
  console.dir(await db.collection('delivery_events').aggregate(avgDeliveryTimePerZone()).toArray(), { depth: null });

  console.log('\n=== 2. Weather interference per zone ===');
  console.dir(await db.collection('delivery_events').aggregate(weatherInterferencePerZone()).toArray(), { depth: null });

  console.log('\n=== 3. Battery drain per zone/hour ===');
  console.dir(await db.collection('telemetry').aggregate(batteryDrainPerZoneHour()).toArray(), { depth: null });

  await client.close();
}

if (process.argv[1] && process.argv[1].includes('aggregations.js')) {
  main().catch((err) => { console.error(err); process.exit(1); });
}