import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/dronegrid';

const client = new MongoClient(MONGO_URL);

test('avg delivery time per zone aggregation returns documents', async () => {
  await client.connect();
  const db = client.db();
  const rows = await db.collection('delivery_events').aggregate([
    { $group: { _id: '$zone_id', avgDuration: { $avg: '$duration_sec' }, count: { $sum: 1 } } },
    { $sort: { avgDuration: -1 } },
  ]).toArray();
  assert.ok(Array.isArray(rows));
  assert.ok(rows.length > 0, 'delivery_events should produce aggregation rows');
  for (const r of rows) {
    assert.ok(Number.isFinite(r.avgDuration));
    assert.ok(r.count >= 1);
  }
});

test('weather interference per zone aggregation returns documents', async () => {
  const rows = await client.db().collection('delivery_events').aggregate([
    { $group: { _id: '$zone_id', avgWind: { $avg: '$wind_speed_at_delivery' }, maxDeviation: { $max: '$deviation_m' } } },
    { $sort: { avgWind: -1 } },
  ]).toArray();
  assert.ok(Array.isArray(rows));
  assert.ok(rows.length > 0);
  for (const r of rows) {
    assert.ok(Number.isFinite(r.avgWind));
    assert.ok(Number.isFinite(r.maxDeviation));
  }
});

test('telemetry rollup per zone/hour returns documents', async () => {
  const rows = await client.db().collection('telemetry').aggregate([
    { $project: { hour: { $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$ts' } }, battery: '$battery_pct', zoneId: '$meta.zone_id' } },
    { $group: { _id: { hour: '$hour', zoneId: '$zoneId' }, avgBattery: { $avg: '$battery' } } },
    { $limit: 5 },
  ]).toArray();
  assert.ok(Array.isArray(rows));
  assert.ok(rows.length > 0);
  for (const r of rows) {
    assert.ok(Number.isFinite(r.avgBattery));
  }
});

test('2dsphere index exists on telemetry location', async () => {
  const indexes = await client.db().collection('telemetry').indexes();
  const has2dsphere = indexes.some((i) => i.key && i.key.location === '2dsphere');
  assert.ok(has2dsphere, 'telemetry should have a 2dsphere index on location');
});

test('grid_zones has boundary 2dsphere index', async () => {
  const indexes = await client.db().collection('grid_zones').indexes();
  const has2dsphere = indexes.some((i) => i.key && i.key.boundary === '2dsphere');
  assert.ok(has2dsphere, 'grid_zones should have a 2dsphere index on boundary');
});

test.after(() => client.close());