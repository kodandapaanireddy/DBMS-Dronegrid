import { MongoClient } from 'mongodb';
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/dronegrid';
console.log('Connecting to MongoDB and creating missing indexes...');
const client = new MongoClient(MONGO_URL);
await client.connect();
const db = client.db('dronegrid');

console.log('\n--- telemetry indexes ---');
const telemetryIndexes = await db.collection('telemetry').indexes();
for (const idx of telemetryIndexes) console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`);

console.log('\n--- grid_zones indexes ---');
const gzIndexes = await db.collection('grid_zones').indexes();
for (const idx of gzIndexes) console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`);

console.log('\n--- weather_readings indexes ---');
const wIndexes = await db.collection('weather_readings').indexes();
for (const idx of wIndexes) console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`);

console.log('\n--- delivery_events indexes ---');
const dIndexes = await db.collection('delivery_events').indexes();
for (const idx of dIndexes) console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`);

// Check for 2dsphere indexes
console.log('\n=== Checking for 2dsphere indexes ===');
const hasTelemetryGeo = (await db.collection('telemetry').indexes()).some((i) => i.key?.location === '2dsphere');
console.log(`telemetry has 2dsphere on location: ${hasTelemetryGeo}`);
const hasGZGeo = (await db.collection('grid_zones').indexes()).some((i) => i.key?.boundary === '2dsphere');
console.log(`grid_zones has 2dsphere on boundary: ${hasGZGeo}`);
const hasGZCenter = (await db.collection('grid_zones').indexes()).some((i) => i.key?.center === '2dsphere');
console.log(`grid_zones has 2dsphere on center: ${hasGZCenter}`);

if (!hasTelemetryGeo) {
  console.log('\nCreating telemetry.location 2dsphere index...');
  await db.collection('telemetry').createIndex({ location: '2dsphere' });
  console.log('Done.');
}
if (!hasGZGeo || !hasGZCenter) {
  console.log('\nCreating grid_zones 2dsphere indexes...');
  await db.collection('grid_zones').createIndex({ boundary: '2dsphere' });
  await db.collection('grid_zones').createIndex({ center: '2dsphere' });
  console.log('Done.');
}

// Also check drone-meta-related indexes for telemetry
console.log('\n=== Checking telemetry meta indexes ===');
const allTelemetryIndexes = await db.collection('telemetry').indexes();
for (const idx of allTelemetryIndexes) {
  if ('key' in idx && idx.key['meta.drone_id']) {
    console.log(`  found: ${idx.name}: ${JSON.stringify(idx.key)}`);
  }
  if ('key' in idx && idx.key['meta.zone_id']) {
    console.log(`  found: ${idx.name}: ${JSON.stringify(idx.key)}`);
  }
}

await client.close();
console.log('\nIndex creation complete.');
