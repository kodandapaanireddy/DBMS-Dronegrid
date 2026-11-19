# 🚁 Urban Autonomous Drone Logistics & Grid Management — DBMS

> A production-ready polyglot-persistence Database Management System for Bengaluru's 3 km drone delivery grid. PostgreSQL for ACID orders & billing, MongoDB for high-frequency telemetry, Next.js App Router frontend with role-based access control — plain JavaScript only, no TypeScript.

[![Node](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-green.svg)](https://www.mongodb.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/Tests-21%2F21%20passing-brightgreen.svg)](https://nodejs.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [ER Diagram](#er-diagram)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [Database Setup](#database-setup)
- [API Reference](#api-reference)
- [Demo Script](#demo-script)
- [Test Suite](#test-suite)
- [Security Hardening](#security-hardening)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Package Scripts](#package-scripts)
- [Contributing](#contributing)

---

## 🏗 Overview

**Urban Autonomous Drone Logistics & Grid Management** is a polyglot-persistence DBMS designed for managing a fleet of autonomous delivery drones across Bengaluru's 3 km grid zones.

### Key Capabilities

| Feature | Technology | Implementation |
|---------|-----------|----------------|
| Transactional Orders | PostgreSQL 16 | PL/pgSQL `place_order()` with `FOR UPDATE SKIP LOCKED` atomic transactions |
| Telemetry Storage | MongoDB 7 | Time-series collections with TTL expiration (30 days) |
| Geospatial Queries | MongoDB 2dsphere | `$geoNear`, `$geoWithin` on drone locations and zone boundaries |
| Role-Based Access | Next.js + JWT | `grid_admin` vs `customer` roles, httpOnly cookies |
| Rate Limiting | In-process sliding window | `middleware.js` rateLimit: 30 req/IP/15min on login + register |
| Audit Trail | Append-only `audit_log` table | Login failures, role violations logged to PostgreSQL |
| Security Headers | Next.js middleware + config | X-Content-Type-Options, X-Frame-Options, Cache-Control, COOP/COEP |
| Trigger Automation | PL/pgSQL Triggers | Battery-low → Maintenance, last_seen_at sync, monotonic resolution |
| Aggregations | MongoDB `$facet` | Avg delivery time, weather interference, battery drain per zone/hour |
| Views | PostgreSQL Views | `active_fleet_view`, `zone_fleet_summary_view`, `order_payment_summary_view` |

### Why Polyglot Persistence?

| Data Type | Database | Reason |
|-----------|----------|--------|
| Orders, Payments, Invoices, Users, Drones | PostgreSQL | ACID compliance, FK integrity, CHECK constraints, row-level locking |
| Telemetry, Weather, Grid Zones | MongoDB | Write-heavy throughput, flexible schema, geospatial indexing, TTL |

---

## 🎯 ER Diagram

### PostgreSQL (Relational)

```mermaid
erDiagram
    users ||--o{ orders : places
    users ||--o{ invoices : receives
    drone_models ||--o{ drones : defines
    grid_zones ||--o{ drones : home_of
    grid_zones ||--o{ orders : pickup_in
    drones ||--o{ orders : fulfills
    orders ||--|| payments : generates
    orders ||--|| invoices : generates
    drones ||--o{ maintenance_log : triggers
```

**Relationship Notes:**
- `PAYMENT` and `INVOICE` are weak entities — total participation with `ORDER` (NOT NULL on `order_id` FK).
- `MAINTENANCE_LOG` is a weak entity — identifying relationship to `DRONE`.
- All financial/order logic is ACID via `place_order()` PL/pgSQL transaction.

### MongoDB (Document Model)

**`telemetry`** (time-series collection):
```json
{
  "ts": ISODate,
  "meta": { "drone_id": int, "zone_id": string },
  "location": { "type": "Point", "coordinates": [lng, lat] },
  "altitude_m": number,
  "speed_mps": number,
  "battery_pct": number,
  "temperature_c": number,
  "signal_strength": number
}
```
Indexes: `2dsphere(location)`, `(meta.drone_id, ts DESC)`, `(meta.zone_id, ts DESC)` | TTL: 30 days

**`grid_zones`**:
```json
{
  "zone_code": "BLR-Z01",
  "name": "Indiranagar",
  "boundary": { "type": "Polygon", "coordinates": [...] },
  "center": { "type": "Point", "coordinates": [77.64, 12.97] },
  "neighbours": ["BLR-Z02", "BLR-Z05"],
  "coverage_status": "active"
}
```
Indexes: `2dsphere(boundary)`, `2dsphere(center)`, `zone_code` (unique)

**`delivery_events`**:
```json
{
  "order_id": int,
  "drone_id": int,
  "zone_id": string,
  "started_at": ISODate,
  "completed_at": ISODate,
  "duration_sec": int,
  "wind_speed_at_delivery": number,
  "deviation_m": number,
  "status": "delivered" | "failed"
}
```
Indexes: `order_id` (unique), `(drone_id, started_at DESC)`, `(zone_id, completed_at DESC)`

---

## 📋 Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 18.17.0 | Required for Next.js 14 |
| Docker & Docker Compose | Latest | For PostgreSQL + MongoDB containers |
| psql client | Optional | For local PostgreSQL access |
| mongosh client | Optional | For local MongoDB access |

Verify installations:
```bash
node --version          # v18.17.0+
docker --version        # Docker 20+
docker compose version  # Compose v2
```

---

## 🚀 Installation

### 1. Navigate to project directory

```bash
cd D:\Project\DBMS
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Copy environment configuration

```bash
cp .env.example .env
```

Edit `.env` with your credentials if needed. Defaults work for local development.

---

## ⚙️ Configuration

### `.env` file

Create `.env` in the project root with the following variables:

```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=dronegrid
POSTGRES_PORT=5432
DATABASE_URL=postgres://postgres:your-secure-password@127.0.0.1:5432/dronegrid

# MongoDB
MONGO_USER=mongo
MONGO_PASSWORD=your-mongo-password
MONGO_DB=dronegrid
MONGO_PORT=27017
MONGO_URL=mongodb://127.0.0.1:27017/dronegrid

# Application
APP_PORT=3000
JWT_SECRET=your-jwt-secret-change-in-production
TELEMETRY_API_KEY=telemetry-ingest
```

### Key Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | `your-secure-password` | PostgreSQL superuser password |
| `DATABASE_URL` | Full connection string | App PostgreSQL connection string |
| `MONGO_URL` | Full connection string | App MongoDB connection string |
| `JWT_SECRET` | `change-in-production` | JWT signing secret — **must change in production** |
| `TELEMETRY_API_KEY` | `telemetry-ingest` | API key for telemetry ingestion endpoint |
| `APP_PORT` | `3000` | Next.js dev server port |

> ⚠️ **Security**: Never commit `.env` to version control. Change `JWT_SECRET` in production.

---

## ▶️ Running the Project

### Step 1: Start PostgreSQL & MongoDB (Docker)

```bash
docker compose up -d postgres mongo
```

Wait for both containers to become healthy:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Expected output:
```
NAMES             STATUS
dronegrid-db      Up (healthy)
dronegrid-mongo   Up (healthy)
```

### Step 2: Initialize Databases

**PostgreSQL** — apply schema, seed data, triggers, views, and transactions:

```bash
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/schema.sql
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/seed.sql
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/triggers.sql
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/views.sql
psql -h 127.0.0.1 -U postgres -d dronegrid -v ON_ERROR_STOP=1 -f db/postgres/transactions.sql
```

**MongoDB** — initialize collections and seed data:

```bash
mongosh "mongodb://127.0.0.1:27017/dronegrid" < db/mongo/init.js
mongosh "mongodb://127.0.0.1:27017/dronegrid" < db/mongo/seed.js
```

### Step 3: Start the Next.js Application

```bash
npm run dev
```

The app starts at `http://localhost:3000`.

---

## 🗄 Database Setup (Quick Reference)

### PostgreSQL Schema Files

| File | Purpose |
|------|---------|
| `db/postgres/schema.sql` | Tables, enums, CHECK constraints, indexes (idempotent) |
| `db/postgres/seed.sql` | Deterministic seed data |
| `db/postgres/triggers.sql` | PL/pgSQL triggers: battery→Maintenance, last_seen_at sync, maintenance resolution |
| `db/postgres/views.sql` | `active_fleet_view`, `zone_fleet_summary_view`, `order_payment_summary_view` |
| `db/postgres/transactions.sql` | `place_order()`, `repair_drone()`, `capture_payment()`, `haversine_km()` |
| `db/postgres/queries.sql` | Ad-hoc inspection queries |

### MongoDB Files

| File | Purpose |
|------|---------|
| `db/mongo/init.js` | Collection creation, validators, indexes, 2dsphere, TTL |
| `db/mongo/seed.js` | Seed telemetry, weather, delivery events, grid zones |
| `db/mongo/aggregations.js` | MongoDB aggregation pipelines |

---

## 🔌 API Reference

### Authentication

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | none | Register a new customer |
| `/api/auth/login` | POST | none | Login (sets httpOnly JWT cookie) — rate-limited |
| `/api/auth/logout` | POST | none | Clear session cookie |
| `/api/auth/me` | GET | cookie | Current user profile |

### Orders

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/orders/create` | POST | cookie | Place order (atomic PL/pgSQL transaction) |
| `/api/orders/list` | GET | cookie | List orders (customers see own only) |
| `/api/orders/[id]` | GET | cookie | Get one order (owner or admin) |

### Fleet (Admin Only)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/fleet/active` | GET | admin cookie | Active fleet view |
| `/api/fleet/zone-summary` | GET | admin cookie | Drones by status per zone |
| `/api/fleet/repair` | POST | admin cookie | Repair drone (Maintenance → Idle) |

### Analytics (Admin Only)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/analytics?pipeline=avg_delivery_time_per_zone` | GET | admin cookie | Average delivery time per zone |
| `/api/analytics?pipeline=weather_interference_per_zone` | GET | admin cookie | Weather interference per zone |
| `/api/analytics?pipeline=battery_drain_per_zone_hour` | GET | admin cookie | Battery drain per zone/hour |

### Telemetry

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/telemetry/ingest` | POST | API key | Batch telemetry ingest |
| `/api/telemetry/by-drone` | POST | cookie | Telemetry history for a drone |

### Health

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | none | PostgreSQL + MongoDB connectivity |

### Admin Audit Trail (Admin Only)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/audit` | GET | admin cookie | Recent audit entries, newest first |

---

## 🎬 Demo Script

### Prerequisites

- `docker compose up -d postgres mongo` running
- Both databases seeded
- App running at `http://localhost:3000`

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Grid Admin | `admin@dronegrid.in` | `Admin@123` |
| Customer | `rahul.sharma@email.com` | `Customer@123` |

---

### Demo Step 1 — Transactional Order Placement

1. Log in as customer: `rahul.sharma@email.com` / `Customer@123`
2. Go to **Create Order** (on `/customer/orders`)
3. Enter:
   - Pickup: `12.9781, 77.6404`
   - Dropoff: `12.9287, 77.6271`
   - Zone: `1`, Weight: `1.5 kg`, Method: `UPI`
4. Click **Place Order**
5. Verify: order appears in **My Orders** with status `Assigned`

### Demo Step 2 — Forced Payment Failure (Rollback)

1. Call `/api/orders/create` with `force_failure: true` via API
2. Expect `409`: "Payment failed (simulated) — order rolled back"
3. Verify database unchanged:
   ```sql
   SELECT COUNT(*) FROM orders;
   SELECT COUNT(*) FROM payments;
   SELECT COUNT(*) FROM invoices;
   ```

### Demo Step 3 — Concurrency Test (No Double-Assignment)

Run:

```bash
node --test tests/transactions.test.js
```

The "concurrent orders against 5 drones" test:
- Makes exactly 5 drones `Idle`
- Fires 20 simultaneous orders
- Asserts: no drone has more than 1 active order
- Asserts: at most 5 drones are `Assigned`/`In_Transit`

### Demo Step 4 — Trigger: Low Battery → Maintenance

1. Log in as grid admin: `admin@dronegrid.in` / `Admin@123`
2. Go to **Fleet** — note a drone's `drone_id`
3. Run telemetry simulator forcing battery below threshold:

```bash
node simulator/simulator.js --force-battery 3
```

4. Watch the admin dashboard **Fleet** page — drone status flips to `Maintenance` with health `Critical`
5. Verify `maintenance_log` gains an open row (`resolved_at IS NULL`)
6. **Repair**: click **Repair** on Fleet page → status returns to `Idle`, battery resets to 100

### Demo Step 5 — MongoDB Aggregations (Admin Analytics)

1. As grid admin, go to **Analytics**
2. **Average Delivery Time per Zone** — table with avg/max delivery minutes
3. **Weather Interference per Zone** — zones ranked by interference score
4. **Battery Drain per Zone / Hour** — lowest battery zones first

Endpoints:
```
GET /api/analytics?pipeline=avg_delivery_time_per_zone
GET /api/analytics?pipeline=weather_interference_per_zone
GET /api/analytics?pipeline=battery_drain_per_zone_hour
```

### Demo Step 6 — Role-Based Access (Customer Isolation)

1. Log in as customer `rahul.sharma@email.com`
2. Try `/admin/dashboard` or `/api/fleet/active` → `403 Forbidden`
3. In **My Orders**, every order's `customer_id` equals the logged-in user's ID

### Demo Step 7 — System Health

1. As grid admin, go to **System Health**
2. Verify PostgreSQL and MongoDB both show `OK`
3. Review recent failed payments and open maintenance logs

### Demo Step 8 — Security Hardening (Rate Limiting + Audit Trail)

This demo verifies two backend security controls added after Phase 1:

**(a) Brute-force rate limiting on `/api/auth/login`**

Log in as the customer `rahul.sharma@email.com` with wrong password 35 times rapidly from the same browser/IP. The first 30 attempts return `401 Invalid email or password`. Starting on the 31st request, responses switch to `429 Too Many Requests` with a `Retry-After` header telling you how long to wait. This closes the credential-stuffing vector on the login endpoint.

Verifying via curl:
```bash
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"rahul.sharma@email.com","password":"WRONG"}';
done
# expect: 401 x 30, then 429 x 5
```

**(b) Append-only audit trail via admin endpoint**

Log in as grid admin `admin@dronegrid.in`, then call:
```bash
curl http://localhost:3000/api/admin/audit?limit=20 \
  -H 'Cookie: dg_token=<admin-jwt>'
```
You get JSON with `entries` (recent login failures, order creations, etc.) newest-first. Each entry carries actor, action, resource, status, detail — exactly what you need to answer "who did what, when, and why it failed." Watch it populate as you run the other demo steps.

---

## 🧪 Test Suite

Run all tests:

```bash
npm test
```

### Test Files

| File | Tests | Description |
|------|-------|-------------|
| `tests/security.test.js` | 2 | logAudit helper tolerates missing fields, defaults gracefully |
| `tests/ratelimit.test.js` | 2 | Non-rate-limited paths pass through; exactly MAX_REQUESTS then 429 shape |
| `tests/audit.test.js` | 2 | Audit endpoint requires auth; login failures recorded in audit trail |
| `tests/authz.test.js` | 3 | Customer cannot access admin routes; rate-limit enforcement (429 after 30 logins); customer isolation across orders |
| `tests/transactions.test.js` | 3 | Rollback on payment failure, single drone per order, no double-assignment under concurrency |
| `tests/triggers.test.js` | 5 | Battery threshold trigger, last_seen_at sync, In_Flight landing rule, CHECK constraint, unique email |
| `tests/aggregations.test.js` | 5 | MongoDB aggregations, 2dsphere indexes |

**Expected: 21/21 pass**

Run individual files:

```bash
node --test tests/security.test.js
node --test tests/ratelimit.test.js
node --test tests/audit.test.js
node --test tests/authz.test.js
node --test tests/transactions.test.js
node --test tests/triggers.test.js
node --test tests/aggregations.test.js
```

---

## 🔒 Security Hardening

After Phase 1, the following security features were added:

### 1. Role-Based Access Control (RBAC)

Implemented via middleware at `middleware.js`:

- Customers can only access their own orders (see `customer_id` equality check).
- Only `grid_admin` roles can access `/api/fleet/*` and `/api/analytics/*`.
- Non-admin users receive a `403 Forbidden` JSON response from API routes or a redirect to `/customer/orders` from UI routes.
- Every protected route requires a valid JWT — unauthenticated requests get `401 Not authenticated`.

### 2. JWT Authentication via httpOnly Cookies

`src/lib/auth.js`:
- Tokens signed with `JWT_SECRET` using `jsonwebtoken`, verified with symmetric verify.
- Cookie `dg_token` is set with `httpOnly: true` so JavaScript can't read it, `sameSite: lax`, `secure: true` in production.
- Routes extract the token from the Cookie header (not localStorage).

### 3. Sliding-Window IP Rate Limiting

`src/middleware.js` `rateLimit()` function:

- Hits on login (`/api/auth/login`) and register (`/api/auth/register`) only.
- Sliding window of 15 minutes; max 30 requests per IP.
- After 30 requests, returns `429` with `Retry-After` header and JSON body.
- State lives in-process (Map); swap to Redis for production multi-instance.

### 4. Security Response Headers

`applySecurityHeaders()` called on every response from middleware:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-sniffing attacks |
| `X-Frame-Options` | `DENY` | Prevents clickjacking (DRDoS by framing) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Restricts browser sensors |
| `Cache-Control` | `no-store, must-revalidate` | Prevents stale sensitive data |

Plus `next.config.js` sets COOP/COEP headers to enable cross-origin isolation for WASM.

### 5. Append-Only Audit Log Table

`db/postgres/schema.sql`:
```sql
CREATE TABLE audit_log (
    log_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor VARCHAR(80) NOT NULL,
    action VARCHAR(60) NOT NULL,
    resource VARCHAR(60),
    status SMALLINT,
    detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor);
CREATE INDEX idx_audit_log_action ON audit_log(action);
```

`src/lib/security.js`:
- `logAudit(entry)` — inserts into `audit_log`; swallow errors so a failed write never breaks the request flow.
- Called from `/api/auth/login` on both failure paths (no such email, bad password).

### 6. Admin Audit Endpoint

`src/app/api/admin/audit/route.js`:
- `GET` requires a valid `grid_admin` JWT.
- Returns `{ entries }` — recent 100 (capped at 500) by `created_at DESC`.
- Demonstrates defense-in-depth: RBAC enforced at route boundary AND inside the handler.

---

## 📁 Project Structure

```
D:\Project\DBMS\
├── .env                          # Environment variables (create from .env.example)
├── .env.example                  # Environment variable template
├── docker-compose.yml            # Docker Compose orchestration (PostgreSQL + MongoDB)
├── Dockerfile                    # App container image
├── middleware.js                 # Next.js middleware (root level)
├── next.config.js                # Next.js configuration
├── postcss.config.js             # PostCSS configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── jsconfig.json                 # JavaScript configuration
├── package.json                  # Node.js dependencies & scripts
├── README.md                     # This file
├── db/
│   ├── mongo/
│   │   ├── init.js               # MongoDB collection init, validators, indexes
│   │   ├── seed.js               # MongoDB seed data
│   │   └── aggregations.js       # MongoDB aggregation pipelines
│   └── postgres/
│       ├── schema.sql            # Tables, enums, CHECK constraints, indexes
│       ├── seed.sql              # Deterministic seed data
│       ├── triggers.sql          # PL/pgSQL triggers (battery, last_seen, maintenance)
│       ├── views.sql             # PostgreSQL views (active_fleet, zone_summary, etc.)
│       ├── transactions.sql      # PL/pgSQL functions (place_order, repair_drone, etc.)
│       └── queries.sql           # Ad-hoc inspection queries
├── docs/
│   ├── demo-script.md            # Step-by-step demo walkthrough
│   ├── justification.md          # Polyglot persistence design rationale
│   ├── phase1-report.md          # Phase 1 documentation
│   ├── phase2_run_commands.md    # Phase 2 SQL commands
│   └── security.md               # Security hardening documentation
├── simulator/
│   └── simulator.js              # Telemetry simulator (drone battery drain)
├── src/
│   ├── app/
│   │   ├── page.jsx              # Landing page
│   │   ├── layout.jsx            # Root layout
│   │   ├── globals.css           # Global styles (Tailwind + custom design system)
│   │   ├── login/                # Login page
│   │   ├── register/             # Registration page
│   │   ├── admin/                # Admin routes (dashboard, fleet, analytics, health)
│   │   ├── customer/             # Customer routes (orders + create-order combined)
│   │   └── api/                  # Next.js Route Handlers
│   │       ├── auth/             # register, login, logout, me
│   │       ├── orders/           # create, list, [id]
│   │       ├── fleet/            # active, zone-summary, repair
│   │       ├── analytics/        # Mongo aggregation pipelines
│   │       ├── telemetry/        # ingest, by-drone
│   │       └── health/           # system health check
│   └── lib/
│       ├── auth.js               # JWT sign/verify, cookie helpers, jsonOk/jsonError re-export
│       ├── db.js                 # PostgreSQL pool client
│       ├── mongo.js              # MongoDB client
│       └── schemas.js           # Zod validation schemas + jsonOk/jsonError
├── tests/
│   ├── security.test.js          # logAudit unit tests
│   ├── ratelimit.test.js         # rateLimit logic tests
│   ├── audit.test.js             # audit endpoint tests
│   ├── authz.test.js             # Authorization (RBAC, rate limit, customer isolation)
│   ├── transactions.test.js      # PostgreSQL transaction tests
│   ├── triggers.test.js          # PostgreSQL trigger tests
│   └── aggregations.test.js      # MongoDB aggregation tests
└── node_modules/                 # Installed dependencies (not committed)
```

---

## 🔧 Environment Variables

All variables live in `.env` at the project root:

| Variable | Example | Required |
|----------|---------|----------|
| `POSTGRES_USER` | `postgres` | Yes |
| `POSTGRES_PASSWORD` | `your-secure-password` | Yes |
| `POSTGRES_DB` | `dronegrid` | Yes |
| `POSTGRES_PORT` | `5432` | Yes |
| `DATABASE_URL` | Full connection string | Yes |
| `MONGO_USER` | `mongo` | Yes |
| `MONGO_PASSWORD` | `your-mongo-password` | Yes |
| `MONGO_DB` | `dronegrid` | Yes |
| `MONGO_PORT` | `27017` | Yes |
| `MONGO_URL` | Full connection string | Yes |
| `APP_PORT` | `3000` | No |
| `JWT_SECRET` | `change-in-production` | Yes |
| `TELEMETRY_API_KEY` | `telemetry-ingest` | Yes |

---

## 📦 Package Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `next dev` | Start dev server |
| `npm run build` | `next build` | Production build |
| `npm start` | `next start` | Serve production build |
| `npm run lint` | `next lint` | Lint existing code |
| `npm test` | `node --test ...` | Run all tests |
| `npm run docs:security` | `node docs/security.js` | Prints the demo verification checklist |
| `npm run test` | `node --test ...` | Run all tests (21/21 expected) |
| `npm run simulator` | `node simulator/simulator.js` | Run telemetry simulator |
| `npm run mongo:seed` | `node db/mongo/seed.js` | Seed MongoDB |
| `npm run mongo:agg` | `node db/mongo/aggregations.js` | Export MongoDB aggregations |

---

- Add a dedicated demo step in `Demo Step 8`.
- Add tests in `tests/`.
- Verify with `npm test` (all new test count toward the 21/21 badge).

---
