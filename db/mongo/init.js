// =============================================================================
// Urban Drone Logistics DBMS — MongoDB initialization (Phase 4)
// =============================================================================
// Run via docker-compose: the /db/mongo directory is mounted as
// /docker-entrypoint-initdb.d so this file runs automatically on first start.
// Re-runnable: drops and recreates collections.
// =============================================================================

const db = db.getSiblingDB('dronegrid');

// ---------------------------------------------------------------------------
// 1. grid_zones — spatial grid with GeoJSON Polygon boundaries + neighbours
// ---------------------------------------------------------------------------
db.grid_zones.drop();
db.createCollection('grid_zones', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['zone_code', 'boundary', 'center', 'neighbours', 'coverage_status'],
      properties: {
        zone_code: { bsonType: 'string' },
        name: { bsonType: 'string' },
        boundary: {
          bsonType: 'object',
          required: ['type', 'coordinates'],
          properties: {
            type: { enum: ['Polygon'] },
            coordinates: {
              bsonType: 'array',
              items: {
                bsonType: 'array',
                items: { bsonType: 'array', items: { bsonType: 'double' } },
              },
            },
          },
        },
        center: {
          bsonType: 'object',
          required: ['type', 'coordinates'],
          properties: {
            type: { enum: ['Point'] },
            coordinates: { bsonType: 'array', items: { bsonType: 'double' } },
          },
        },
        neighbours: { bsonType: 'array', items: { bsonType: 'string' } },
        coverage_status: { enum: ['active', 'uncovered'] },
      },
    },
  },
});

db.grid_zones.createIndex({ boundary: '2dsphere' });
db.grid_zones.createIndex({ center: '2dsphere' });
db.grid_zones.createIndex({ zone_code: 1 }, { unique: true });

// ---------------------------------------------------------------------------
// 2. telemetry — TIME-SERIES collection
//    timeField: ts, metaField: meta { drone_id, zone_id }
// ---------------------------------------------------------------------------
db.telemetry.drop();
db.createCollection('telemetry', {
  timeseries: {
    timeField: 'ts',
    metaField: 'meta',
    granularity: 'seconds',
  },
  expireAfterSeconds: 60 * 60 * 24 * 30, // 30-day TTL on raw telemetry
});

db.telemetry.createIndex({ 'meta.drone_id': 1, ts: -1 });
db.telemetry.createIndex({ 'meta.zone_id': 1, ts: -1 });
db.telemetry.createIndex({ location: '2dsphere' });
db.telemetry.createIndex({ ts: 1 });

// ---------------------------------------------------------------------------
// 3. weather_readings — per-zone weather observations
// ---------------------------------------------------------------------------
db.weather_readings.drop();
db.createCollection('weather_readings', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['zone_id', 'ts', 'wind_speed_kmh', 'wind_direction_deg',
                 'rainfall_mm', 'visibility_km', 'temperature_c'],
      properties: {
        zone_id: { bsonType: 'string' },
        ts: { bsonType: 'date' },
        wind_speed_kmh: { bsonType: 'double' },
        wind_direction_deg: { bsonType: 'double' },
        rainfall_mm: { bsonType: 'double' },
        visibility_km: { bsonType: 'double' },
        temperature_c: { bsonType: 'double' },
      },
    },
  },
});
db.weather_readings.createIndex({ zone_id: 1, ts: -1 });
db.weather_readings.createIndex({ ts: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

// ---------------------------------------------------------------------------
// 4. delivery_events — completed deliveries with weather context
// ---------------------------------------------------------------------------
db.delivery_events.drop();
db.createCollection('delivery_events', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['order_id', 'drone_id', 'zone_id', 'started_at', 'completed_at',
                 'duration_sec', 'wind_speed_at_delivery', 'deviation_m', 'status'],
      properties: {
        order_id: { bsonType: 'int' },
        drone_id: { bsonType: 'int' },
        zone_id: { bsonType: 'string' },
        started_at: { bsonType: 'date' },
        completed_at: { bsonType: 'date' },
        duration_sec: { bsonType: 'int' },
        wind_speed_at_delivery: { bsonType: 'double' },
        deviation_m: { bsonType: 'double' },
        status: { enum: ['delivered', 'failed'] },
      },
    },
  },
});
db.delivery_events.createIndex({ order_id: 1 }, { unique: true });
db.delivery_events.createIndex({ drone_id: 1, started_at: -1 });
db.delivery_events.createIndex({ zone_id: 1, completed_at: -1 });

print('MongoDB collections and indexes created successfully.');