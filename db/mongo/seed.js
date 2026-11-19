// =============================================================================
// Urban Drone Logistics DBMS — MongoDB seed script
// =============================================================================
// Run:   MONGO_URL="mongodb://mongo:mongo@localhost:27017/dronegrid"
//        node db/mongo/seed.js
// Seeds 40 Bengaluru grid zones (3 km circle grid), weather readings,
// 50,000 telemetry points for 30 drones, and delivery events.
// =============================================================================

import { MongoClient } from 'mongodb';

// Deterministic-ish pseudo-random generator
const SEED = 0.42;
let rngState = SEED;
function rng() {
  // xorshift-style LCG for reproducible randomness in [0,1)
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
  return rngState / 0x7fffffff;
}
function randInt(min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
function randFloat(min, max) {
  return min + rng() * (max - min);
}
function randPick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:mongo@localhost:27017/dronegrid';
const DRONE_COUNT = 30;
const TELEMETRY_COUNT = 50_000;

// Bengaluru bounds
const LAT_MIN = 12.83, LAT_MAX = 13.14;
const LNG_MIN = 77.46, LNG_MAX = 77.75;

// Zone names (matches Postgres seed.sql BLR-Z01..Z40)
const ZONE_NAMES = [
  'Indiranagar', 'Koramangala', 'Whitefield', 'Electronic City', 'Hebbal',
  'Jayanagar', 'Yelahanka', 'HSR Layout', 'Marathahalli', 'Rajajinagar',
  'Banashankari', 'Malleshwaram', 'Sadashivnagar', 'Kumaraswamy Layout',
  'BTM Layout', 'JP Nagar', 'Vijayanagar', 'Wilson Garden', 'Basavanagudi',
  'Bannerghatta', 'Arekere', 'Chikkajala', 'Dunasandra', 'Varthur',
  'Kundalahalli', 'Kadubeesanahalli', 'Bellandur', 'HAL Museum',
  'Suranjan Das Road', 'Thippasandra', 'Gandhi Nagar', 'Richmond Town',
  'Cox Town', 'Cooke Town', 'Benson Town', 'Lingarajapuram', 'Sivancheti Gardens',
  'Kaggadasapura', 'Krishnarajapuram', 'Ramamurthy Nagar',
];

// 3 km ≈ 0.0269 degrees of latitude; longitude spacing scaled by cos(lat)
const ZONE_SPACING_KM = 3;
const DEG_PER_KM_LAT = 1 / 111.0;
const DEG_PER_KM_LNG = 1 / 111.0;

function hexPolygon(centerLat, centerLng, radiusKm, n = 12) {
  const degLat = (radiusKm * DEG_PER_KM_LAT);
  const degLng = (radiusKm * DEG_PER_KM_LNG) / Math.cos((centerLat * Math.PI) / 180);
  const coords = [];
  for (let i = 0; i <= n; i++) {
    const angle = (2 * Math.PI * i) / n;
    coords.push([
      centerLng + degLng * Math.cos(angle),
      centerLat + degLat * Math.sin(angle),
    ]);
  }
  return { type: 'Polygon', coordinates: [coords] };
}

function randomLatLng() {
  return [LNG_MIN + Math.random() * (LNG_MAX - LNG_MIN),
          LAT_MIN + Math.random() * (LAT_MAX - LAT_MIN)];
}

function randomWithin(centerLng, centerLat, maxKm) {
  const r = maxKm * Math.sqrt(Math.random());
  const angle = 2 * Math.PI * Math.random();
  const dLat = (r * DEG_PER_KM_LAT) * Math.sin(angle);
  const dLng = (r * DEG_PER_KM_LNG / Math.cos((centerLat * Math.PI) / 180)) * Math.cos(angle);
  return [centerLng + dLng, centerLat + dLat];
}

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db();

  // ---------- grid_zones ----------
  const zones = [];
  // Roughly 3 km center spacing: ~6 rows x 7 cols ≈ 42 zones, trim to 40
  const cols = 7;
  const rows = 6;
  const latStepDeg = (ZONE_SPACING_KM * DEG_PER_KM_LAT);
  const lngStepDeg = (ZONE_SPACING_KM * DEG_PER_KM_LNG) / Math.cos(((LAT_MIN + LAT_MAX) / 2 * Math.PI) / 180);

  let idx = 0;
  for (let r = 0; r < rows && idx < 40; r++) {
    for (let c = 0; c < cols && idx < 40; c++) {
      const centerLat = LAT_MIN + 0.5 * ZONE_SPACING_KM * DEG_PER_KM_LAT + r * latStepDeg;
      const centerLng = LNG_MIN + 0.5 * ZONE_SPACING_KM * DEG_PER_KM_LNG / Math.cos((centerLat * Math.PI) / 180) + c * lngStepDeg;
      if (centerLat > LAT_MAX || centerLng > LNG_MAX) continue;
      const zoneCode = `BLR-Z${String(idx + 1).padStart(2, '0')}`;
      const neighbours = [];
      if (r > 0) neighbours.push(`BLR-Z${String(idx + 1 - cols).padStart(2, '0')}`);
      if (r < rows - 1) neighbours.push(`BLR-Z${String(idx + 1 + cols).padStart(2, '0')}`);
      if (c > 0) neighbours.push(`BLR-Z${String(idx).padStart(2, '0')}`);
      if (c < cols - 1) neighbours.push(`BLR-Z${String(idx + 2).padStart(2, '0')}`);
      zones.push({
        zone_code: zoneCode,
        name: ZONE_NAMES[idx] || zoneCode,
        boundary: hexPolygon(centerLat, centerLng, ZONE_SPACING_KM / 2),
        center: { type: 'Point', coordinates: [centerLng, centerLat] },
        neighbours,
        coverage_status: 'active',
      });
      idx++;
    }
  }
  await db.collection('grid_zones').insertMany(zones);
  console.log(`Inserted ${zones.length} grid zones.`);

  // ---------- weather_readings ----------
  const now = new Date();
  const weather = [];
  for (const z of zones) {
    for (let h = 0; h < 48; h++) { // last 48 hours, hourly
      weather.push({
        zone_id: z.zone_code,
        ts: new Date(now.getTime() - h * 60 * 60 * 1000),
        wind_speed_kmh: Number(randFloat(0, 30).toFixed(1)),
        wind_direction_deg: randInt(0, 359),
        rainfall_mm: Number(randFloat(0, 15).toFixed(1)),
        visibility_km: Number(randFloat(2, 10).toFixed(1)),
        temperature_c: Number(randFloat(18, 35).toFixed(1)),
      });
    }
  }
  await db.collection('weather_readings').insertMany(weather);
  console.log(`Inserted ${weather.length} weather readings.`);

  // ---------- delivery_events ----------
  const deliveryEvents = [];
  const statuses = ['delivered', 'delivered', 'delivered', 'delivered', 'failed']; // 80% delivered
  for (let i = 1; i <= 200; i++) {
    const zone = zones[i % zones.length];
    const started = new Date(now.getTime() - randInt(1, 30 * 24 * 60 * 60 * 1000));
    const durationSec = randInt(300, 1800);
    deliveryEvents.push({
      order_id: i,
      drone_id: 1 + (i % DRONE_COUNT),
      zone_id: zone.zone_code,
      started_at: started,
      completed_at: new Date(started.getTime() + durationSec * 1000),
      duration_sec: durationSec,
      wind_speed_at_delivery: randFloat(0, 30),
      deviation_m: randFloat(0, 500),
      status: randPick(statuses),
    });
  }
  await db.collection('delivery_events').insertMany(deliveryEvents);
  console.log(`Inserted ${deliveryEvents.length} delivery events.`);

  // ---------- telemetry (50,000 points across 30 drones) ----------
  const droneIds = Array.from({ length: DRONE_COUNT }, (_, i) => i + 1);
  const telemetry = [];
  const pointsPerDrone = Math.floor(TELEMETRY_COUNT / DRONE_COUNT);
  const t0 = now.getTime() - 24 * 60 * 60 * 1000; // last 24 hours

  for (let di = 0; di < DRONE_COUNT; di++) {
    const droneId = droneIds[di];
    const home = zones[di % zones.length].center.coordinates;
    // Random walk starting near the home zone
    let lng = home[0] + (Math.random() - 0.5) * 0.02;
    let lat = home[1] + (Math.random() - 0.5) * 0.02;
    let battery = 80 + Math.random() * 20;

    for (let p = 0; p < pointsPerDrone; p++) {
      const ts = new Date(t0 + p * (24 * 60 * 60 * 1000 / pointsPerDrone));
      // Random walk movement
      lng += (Math.random() - 0.5) * 0.005;
      lat += (Math.random() - 0.5) * 0.005;
      // Clamp to Bengaluru bounds
      lng = Math.min(Math.max(lng, LNG_MIN), LNG_MAX);
      lat = Math.min(Math.max(lat, LAT_MIN), LAT_MAX);

      // Battery slowly drains; occasionally a forced drop
      battery -= 0.5 + Math.random();
      if (Math.random() < 0.02) battery -= 20; // forced low battery event

      battery = Math.max(0, Math.min(100, battery));

      const zoneId = zones[Math.floor(Math.random() * zones.length)].zone_code;

      telemetry.push({
        ts,
        meta: { drone_id: droneId, zone_id: zoneId },
        location: { type: 'Point', coordinates: [lng, lat] },
        altitude_m: randFloat(50, 120),
        speed_mps: randFloat(2, 12),
        battery_pct: Math.round(battery * 10) / 10,
        temperature_c: randFloat(20, 32),
        signal_strength: randFloat(-100, -40),
      });
    }
  }

  // Insert in batches for throughput demonstration
  const BATCH = 5_000;
  for (let i = 0; i < telemetry.length; i += BATCH) {
    await db.collection('telemetry').insertMany(telemetry.slice(i, i + BATCH));
    console.log(`Inserted telemetry batch ${i / BATCH + 1}/${Math.ceil(telemetry.length / BATCH)}`);
  }

  // Summary
  const counts = await Promise.all([
    db.collection('grid_zones').countDocuments(),
    db.collection('weather_readings').countDocuments(),
    db.collection('delivery_events').countDocuments(),
    db.collection('telemetry').countDocuments(),
  ]);
  console.log('Seed complete:', {
    grid_zones: counts[0],
    weather_readings: counts[1],
    delivery_events: counts[2],
    telemetry: counts[3],
  });

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});