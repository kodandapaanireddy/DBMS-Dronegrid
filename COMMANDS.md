# 📜 Drone Grid DBMS — Commands to Run & Demo

Copy-paste ready command reference. Every command assumes you are in the project root:

```bash
cd D:\Project\DBMS
```

Replace `<POSTGRES_PASSWORD>` and `<MONGO_PASSWORD>` with the values from your `.env` file.

---

## PHASE 0 — PREREQUISITE CHECK

Verify all required tools are installed:

```bash
node --version          # v18.17.0+
npm --version           # 9.x+
docker --version        # Docker 20+
docker compose version  # Compose v2
```

Install Node.js dependencies (one-time):

```bash
npm install
```

---

## PHASE 1 — ENVIRONMENT SETUP

Copy the environment template:

```bash
cp .env.example .env
```

Open `.env` and set these values:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<POSTGRES_PASSWORD>
POSTGRES_DB=dronegrid
POSTGRES_PORT=5432
DATABASE_URL=postgres://postgres:<URL_ENCODED_PASSWORD>@127.0.0.1:5432/dronegrid

MONGO_USER=mongo
MONGO_PASSWORD=<MONGO_PASSWORD>
MONGO_DB=dronegrid
MONGO_PORT=27017
MONGO_URL=mongodb://127.0.0.1:27017/dronegrid

APP_PORT=3000
JWT_SECRET=change-in-production
TELEMETRY_API_KEY=telemetry-ingest
```

> 💡 If your password contains special characters (like `@`), URL-encode it in `DATABASE_URL` (e.g. `@` → `%40`).

---

## PHASE 2 — START DATABASES (Docker)

Start PostgreSQL and MongoDB containers:

```bash
docker compose up -d postgres mongo
```

Wait ~15 seconds, then verify both are healthy:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Expected output:
```
NAMES             STATUS
dronegrid-db      Up (healthy)
dronegrid-mongo   Up (healthy)
```

---

## PHASE 3 — INITIALIZE DATABASES

### 3a. PostgreSQL — Schema, Seed, Triggers, Views, Transactions

Run each file in order (each is idempotent — safe to re-run):

```bash
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/schema.sql
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/seed.sql
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/triggers.sql
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/views.sql
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/transactions.sql
```

When prompted for password, enter the value from `POSTGRES_PASSWORD` in your `.env`.

### 3b. MongoDB — Collections + Seed Data

```bash
mongosh "mongodb://127.0.0.1:27017/dronegrid" < db/mongo/init.js
mongosh "mongodb://127.0.0.1:27017/dronegrid" < db/mongo/seed.js
```

---

## PHASE 4 — START THE APPLICATION

```bash
npm run dev
```

Expected output:
```
▲ Next.js 14.2.5
- Local:        http://localhost:3000
✓ Ready in Xms
```

Open in browser: `http://localhost:3000`

---

## PHASE 5 — VERIFY HEALTH ENDPOINT

Open in browser or curl:

```bash
curl http://localhost:3000/api/health
```

Expected JSON response:
```json
{
  "postgres": { "ok": true, "latency_ms": 42 },
  "mongo": { "ok": true, "latency_ms": 15 },
  "ok": true
}
```

---

## PHASE 6 — DEMO WALKTHROUGH

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Grid Admin | `admin@dronegrid.in` | `Admin@123` |
| Customer | `rahul.sharma@email.com` | `Customer@123` |

---

### Demo A — Place an Order as Customer

1. Open `http://localhost:3000/login`
2. Login as customer: `rahul.sharma@email.com` / `Customer@123`
3. You're redirected to `/customer/orders`
4. In the **"Place a New Order"** form, enter:
   - Pickup Lat: `12.9781`
   - Pickup Lng: `77.6404`
   - Dropoff Lat: `12.9287`
   - Dropoff Lng: `77.6271`
   - Zone ID: `1`
   - Weight (kg): `1.5`
   - Payment Method: `UPI`
5. Click **Place Order**
6. The order appears in the **Order History** table below on the same page
7. Click **Track** to see live order details

---

### Demo B — Verify Order in PostgreSQL

Connect to PostgreSQL:

```bash
psql -h 127.0.0.1 -U postgres -d dronegrid
```

Run these queries:

```sql
-- See your new order
SELECT * FROM orders ORDER BY order_id DESC LIMIT 3;

-- See the payment
SELECT * FROM payments ORDER BY payment_id DESC LIMIT 3;

-- See the invoice
SELECT * FROM invoices ORDER BY invoice_id DESC LIMIT 3;

-- See which drone was assigned
SELECT drone_id, serial_no, status, battery_pct FROM drones WHERE status = 'Assigned';

-- Exit psql
\q
```

---

### Demo C — Admin Dashboard

1. Logout (customer sidebar → Logout, or go to `/api/auth/logout`)
2. Open `http://localhost:3000/login`
3. Login as admin: `admin@dronegrid.in` / `Admin@123`
4. You're redirected to `/admin/dashboard`

**What you'll see:**
- KPI cards: Total Drones, Idle/Available, In Flight, Maintenance
- Fleet Status table: all drones with serial, model, status, battery, health, current order
- Weather Interference zones table
- Battery Drain per Zone/Hour table

Navigate admin pages from the left sidebar:
- **Dashboard** — fleet overview + analytics
- **Fleet** — zone summary + repair drones
- **Analytics** — MongoDB aggregation results
- **System Health** — Postgres + Mongo connectivity status

---

### Demo D — Trigger: Low Battery → Maintenance

1. As admin, note a drone_id from the Fleet table (e.g. drone_id = 7)
2. Connect to PostgreSQL:

```bash
psql -h 127.0.0.1 -U postgres -d dronegrid
```

3. Drop the drone's battery below critical threshold (15%):

```sql
UPDATE drones SET battery_pct = 5 WHERE drone_id = 7;
```

4. Verify the drone flipped to Maintenance:

```sql
SELECT drone_id, status, battery_pct FROM drones WHERE drone_id = 7;
-- Expected: status = 'Maintenance', battery_pct = 5
```

5. Verify maintenance_log row was created:

```sql
SELECT * FROM maintenance_log WHERE drone_id = 7 AND resolved_at IS NULL;
-- Expected: one open row with battery_pct_at_trigger = 5
```

6. Exit psql: `\q`

7. Refresh the admin **Fleet** page — you'll see the drone now shows `Maintenance` status

8. **Repair the drone:**
   - On the Fleet page, click **Repair** next to the drone
   - Or via SQL:

```sql
-- Reset drone to Idle with full battery
UPDATE drones SET status = 'Idle', battery_pct = 100 WHERE drone_id = 7;

-- Mark maintenance as resolved
UPDATE maintenance_log SET resolved_at = NOW() WHERE drone_id = 7 AND resolved_at IS NULL;
```

---

### Demo E — Role-Based Access (Customer Isolation)

1. Log in as customer: `rahul.sharma@email.com` / `Customer@123`
2. Try to open `http://localhost:3000/admin/dashboard` → **403 Forbidden**
3. In **My Orders**, every order belongs to the logged-in customer only

---

### Demo F — Run Telemetry Simulator

In a separate terminal:

```bash
node simulator/simulator.js
```

This continuously sends telemetry data to MongoDB and syncs battery levels to PostgreSQL. Watch the admin dashboard update in real-time.

To force a specific drone's battery low:

```bash
node simulator/simulator.js --force-battery 3
```

---

## PHASE 7 — RUN THE TEST SUITE

All 15 tests:

```bash
npm test
```

Expected output: **15 pass, 0 fail**

Individual test files:

```bash
node --test tests/transactions.test.js
node --test tests/triggers.test.js
node --test tests/aggregations.test.js
node --test tests/authz.test.js
```

---

## PHASE 8 — DATABASE INSPECTION (psql / mongosh)

### PostgreSQL

Connect:
```bash
psql -h 127.0.0.1 -U postgres -d dronegrid
```

Common meta-commands:
```sql
\dt              -- list all tables
\d users         -- describe users table schema
\d drones        -- describe drones table schema
\d orders        -- describe orders table schema
\d payments      -- describe payments table schema
\d invoices      -- describe invoices table schema
\d maintenance_log  -- describe maintenance_log table schema
\d grid_zones    -- describe grid_zones table schema
\d drone_models  -- describe drone_models table schema
\df              -- list functions (place_order, repair_drone, etc.)
\dv              -- list views
\q               -- quit
```

Common queries:
```sql
-- Row counts per table
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'drones', COUNT(*) FROM drones
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'maintenance_log', COUNT(*) FROM maintenance_log
UNION ALL SELECT 'grid_zones', COUNT(*) FROM grid_zones;

-- Active fleet
SELECT * FROM active_fleet_view ORDER BY drone_id;

-- Zone summary
SELECT * FROM zone_fleet_summary_view ORDER BY zone_code;

-- Orders with payments
SELECT o.order_id, o.status, o.weight_kg, p.amount, p.status AS payment_status
FROM orders o
JOIN payments p ON o.order_id = p.order_id
ORDER BY o.order_id DESC LIMIT 10;

-- Drones needing maintenance
SELECT * FROM drones WHERE status = 'Maintenance';

-- Open maintenance logs
SELECT * FROM maintenance_log WHERE resolved_at IS NULL;
```

### MongoDB

Connect:
```bash
mongosh "mongodb://127.0.0.1:27017/dronegrid"
```

Common commands:
```javascript
show collections

-- Grid zones
db.grid_zones.find().limit(5)

-- Telemetry (latest 5)
db.telemetry.find().sort({ ts: -1 }).limit(5)

-- Delivery events
db.delivery_events.find().limit(5)

-- Weather readings
db.weather_readings.find().limit(5)

-- Indexes on telemetry
db.telemetry.getIndexes()

-- Indexes on grid_zones
db.grid_zones.getIndexes()

-- Count documents
db.telemetry.countDocuments()
db.delivery_events.countDocuments()

exit
```

---

## PHASE 9 — STOP EVERYTHING

Stop the Next.js app:
```
Ctrl+C   (in the `npm run dev` terminal)
```

Stop Docker containers:
```bash
docker compose down
```

Or stop only databases (keep volumes):
```bash
docker compose stop postgres mongo
```

---

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Port 3000 already in use | Kill the existing node process, or Next.js will auto-use 3001 |
| Docker daemon not running | Start Docker Desktop, wait for "Engine running" |
| psql: password authentication failed | Verify `POSTGRES_PASSWORD` in `.env` matches what you type |
| MongoDB authentication failed | Verify `MONGO_URL` in `.env` matches your MongoDB setup |
| Health endpoint shows mongo `ok: false` | Restart `npm run dev` after fixing `.env` MONGO_URL |
| Tests fail with connection refused | Ensure app is running (`npm run dev`) on the port tests expect |
| Build fails on CSS | Clear `.next` folder: `rm -rf .next && npm run build` |

---

## QUICK START (One-Liner Summary)

```bash
# 1. Install deps
npm install

# 2. Copy env
cp .env.example .env

# 3. Start databases
docker compose up -d postgres mongo

# 4. Wait ~15s, then init PostgreSQL
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/schema.sql
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/seed.sql
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/triggers.sql
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/views.sql
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/transactions.sql

# 5. Init MongoDB
mongosh "mongodb://127.0.0.1:27017/dronegrid" < db/mongo/init.js
mongosh "mongodb://127.0.0.1:27017/dronegrid" < db/mongo/seed.js

# 6. Start app
npm run dev

# 7. Open http://localhost:3000 and login
# Admin: admin@dronegrid.in / Admin@123
# Customer: rahul.sharma@email.com / Customer@123

# 8. Run tests
npm test
```

---

**End of COMMANDS.md**
