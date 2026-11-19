// =============================================================================
// Urban Drone Logistics DBMS — Telemetry Simulator
// =============================================================================
// Run:   npm run simulator
//        TELEMETRY_API_KEY=dronegrid-telemetry-key-2024 node simulator/simulator.js
//
// Simulates N drones (default 30) across the Bengaluru grid:
//   - Emits telemetry every 1-2s to /api/telemetry/ingest (batched)
//   - Random walk movement, battery drain, weather variation
//   - Completes simulated deliveries and updates order status in Postgres
//   - --force-battery <drone_id> forces a drone's battery below the critical
//     threshold to demonstrate the Postgres trigger live.
//
// Requirements: Node's built-in fetch (v18+). No extra deps.
// =============================================================================

import pg from 'pg';
const { Pool } = pg;

const TELEMETRY_URL = process.env.TELEMETRY_URL || 'http://localhost:3000/api/telemetry/ingest';
const API_KEY = process.env.TELEMETRY_API_KEY || 'dronegrid-telemetry-key-2024';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/dronegrid';
const DRONE_COUNT = Number(process.env.DRONE_COUNT) || 30;
const INTERVAL_MS = Number(process.env.INTERVAL_MS) || 1500;
const FORCE_DRONE = process.argv.includes('--force-battery')
  ? Number(process.argv[process.argv.indexOf('--force-battery') + 1])
  : null;

// Bengaluru bounds
const LAT_MIN = 12.83, LAT_MAX = 13.14;
const LNG_MIN = 77.46, LNG_MAX = 77.75;

// Deterministic pseudo-random
let rngState = 0.42;
function rng() {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
  return rngState / 0x7fffffff;
}
function randInt(min, max) { return min + Math.floor(rng() * (max - min + 1)); }
function randFloat(min, max) { return min + rng() * (max - min); }

// Zone centers (approx; matches Postgres grid_zones ordering loosely)
const ZONES = [
  { id: 1, lat: 12.9781, lng: 77.6404 }, { id: 2, lat: 12.9287, lng: 77.6271 },
  { id: 3, lat: 12.9694, lng: 77.6667 }, { id: 4, lat: 12.9339, lng: 77.6731 },
  { id: 5, lat: 12.9735, lng: 77.6376 }, { id: 6, lat: 12.9352, lng: 77.5990 },
  { id: 7, lat: 13.0879, lng: 77.5962 }, { id: 8, lat: 12.9392, lng: 77.6377 },
  { id: 9, lat: 12.9558, lng: 77.6538 }, { id: 10, lat: 13.0020, lng: 77.5781 },
];

const pool = new Pool({ connectionString: DATABASE_URL });

// Drone state
const drones = [];
for (let i = 1; i <= DRONE_COUNT; i++) {
  const z = ZONES[(i - 1) % ZONES.length];
  drones.push({
    id: i,
    lat: z.lat + (rng() - 0.5) * 0.01,
    lng: z.lng + (rng() - 0.5) * 0.01,
    battery: 60 + rng() * 40,
    orderId: null,        // active order being delivered
    targetLat: null,      // dropoff target
    targetLng: null,
  });
}

function clampLat(v) { return Math.min(Math.max(v, LAT_MIN), LAT_MAX); }
function clampLng(v) { return Math.min(Math.max(v, LNG_MIN), LNG_MAX); }

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Assign an active order to a drone (for simulation completeness)
async function assignOrder(drone) {
  // Pick a random order from Postgres that's In_Transit/Assigned without a drone?
  // Simpler: create a synthetic delivery target near the drone.
  const zone = ZONES[randInt(0, ZONES.length - 1)];
  drone.targetLat = clampLat(zone.lat + (rng() - 0.5) * 0.02);
  drone.targetLng = clampLng(zone.lng + (rng() - 0.5) * 0.02);
  drone.orderId = randInt(1, 200);
}

function stepDrone(drone) {
  // Forced battery drain for demonstration
  if (FORCE_DRONE === drone.id) {
    drone.battery -= 5;
  } else {
    drone.battery -= 0.1 + rng() * 0.4;
  }
  drone.battery = Math.max(0, Math.min(100, drone.battery));

  // Move toward target if we have one, otherwise random walk
  if (drone.targetLat !== null) {
    const dist = haversineKm(drone.lat, drone.lng, drone.targetLat, drone.targetLng);
    const stepKm = 0.05; // per tick
    const frac = Math.min(1, stepKm / dist);
    drone.lat += (drone.targetLat - drone.lat) * frac;
    drone.lng += (drone.targetLng - drone.lng) * frac;

    // Arrived at dropoff -> complete delivery
    if (dist < 0.05) {
      completeDelivery(drone);
      return;
    }
  } else {
    drone.lat = clampLat(drone.lat + (rng() - 0.5) * 0.002);
    drone.lng = clampLng(drone.lng + (rng() - 0.5) * 0.002);
    if (rng() < 0.02) assignOrder(drone);
  }
}

async function completeDelivery(drone) {
  if (!drone.orderId) return;
  try {
    await pool.query(
      `UPDATE orders SET status = 'Delivered', delivered_at = NOW()
       WHERE order_id = $1 AND status IN ('Assigned', 'In_Transit')`,
      [drone.orderId]
    );
    await pool.query(
      `INSERT INTO maintenance_log (drone_id, reason, battery_pct_at_trigger, triggered_at, resolved_at)
       VALUES ($1, 'Delivery completed', $2, NOW(), NULL)`,
      [drone.id, Math.round(drone.battery)]
    );
    await pool.query(
      `INSERT INTO payments (order_id, amount, currency, status, method, created_at)
       VALUES ($1, 0, 'INR', 'Captured', 'UPI', NOW())
       ON CONFLICT (order_id) DO NOTHING`,
      [drone.orderId]
    );
    console.log(`[sim] Drone ${drone.id} completed delivery order ${drone.orderId} at battery ${drone.battery.toFixed(1)}%`);
  } catch (e) {
    // ignore per-delivery errors
  } finally {
    drone.orderId = null;
    drone.targetLat = null;
    drone.targetLng = null;
  }
}

function buildBatch() {
  const now = new Date();
  const points = [];
  for (const d of drones) {
    stepDrone(d);
    const zone = ZONES[(d.id - 1) % ZONES.length];
    points.push({
      drone_id: d.id,
      zone_id: `BLR-Z${String(zone.id).padStart(2, '0')}`,
      location: { type: 'Point', coordinates: [d.lng, d.lat] },
      battery_pct: Math.round(d.battery * 10) / 10,
      temperature_c: randFloat(20, 32),
      signal_strength: randFloat(-100, -40),
      ts: now.toISOString(),
    });
  }
  return points;
}

async function sendBatch(points) {
  try {
    const res = await fetch(TELEMETRY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ points }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn('[sim] ingest returned', res.status, txt.slice(0, 200));
    }
  } catch (e) {
    // App not running yet — silently retry later
  }
}

let ticks = 0;
async function loop() {
  ticks++;
  const batch = buildBatch();
  await sendBatch(batch);

  if (ticks % 20 === 0) {
    const lowBattery = drones.filter((d) => d.battery <= 15);
    if (lowBattery.length > 0) {
      console.log(`[sim] ${ticks} ticks — low battery drones:`,
        lowBattery.map((d) => `${d.id}(${d.battery.toFixed(0)}%)`).join(', '));
    }
  }

  setTimeout(loop, INTERVAL_MS);
}

loop().catch((e) => { console.error(e); process.exit(1); });

console.log(`[sim] Started — ${DRONE_COUNT} drones, telemetry every ${INTERVAL_MS}ms → ${TELEMETRY_URL}`);
if (FORCE_DRONE) {
  console.log(`[sim] Forcing drone ${FORCE_DRONE} battery below critical threshold...`);
}