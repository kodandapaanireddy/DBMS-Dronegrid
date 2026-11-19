# Demo Script — Drone Grid DBMS

Prerequisites: `docker-compose up` running, both databases seeded, app at
`http://localhost:3000`.

Demo credentials:
- Grid Admin: `admin@dronegrid.in` / `Admin@123`
- Customer: `rahul.sharma@email.com` / `Customer@123`

---

## Step 1 — Transactional order placement (happy path)

1. Log in as customer `rahul.sharma@email.com`.
2. Go to **Create Order**, enter pickup/dropoff coordinates within Bengaluru
   bounds (e.g. pickup 12.9781/77.6404, dropoff 12.9287/77.6271), weight 1.5 kg,
   payment method UPI.
3. Submit. The order is created via `place_order()` — one atomic transaction:
   drone locked with `FOR UPDATE SKIP LOCKED`, order inserted, payment captured,
   drone set to `Assigned`, invoice inserted.
4. Verify: the order appears in **My Orders** with status `Assigned` and a
   `Captured` payment.

## Step 2 — Forced payment failure (rollback)

1. While still logged in as the customer, call the create endpoint with
   `force_failure=true` (e.g. via the API directly or by editing the frontend to
   pass `force_failure: true`).
2. Expect a 409 response: "Payment failed (simulated) — order rolled back".
3. Verify the database is unchanged:
   - `SELECT COUNT(*) FROM orders` — same as before.
   - `SELECT COUNT(*) FROM payments` — same as before.
   - `SELECT COUNT(*) FROM invoices` — same as before.
   - The drone's status is unchanged (still `Idle`).
4. This proves the `place_order()` transaction rolls back on any failure.

## Step 3 — Concurrency test (no double-assignment)

Run the test suite:

```bash
node --test tests/transactions.test.js
```

The "concurrent orders against 5 drones" test makes exactly 5 drones `Idle` and
fires 20 simultaneous orders. Assertions:
- No drone has more than one active order (`COUNT(*) > 1` returns 0 rows).
- At most 5 drones are `Assigned`/`In_Transit`.

## Step 4 — Trigger: low battery → Maintenance

1. Log in as grid admin `admin@dronegrid.in`.
2. Go to **Fleet** — note a drone's `drone_id` and current battery.
3. Run the simulator forcing that drone's battery below threshold:

```bash
node simulator/simulator.js --force-battery 3
```

(Replace `3` with a real drone id.)
4. Within seconds, the admin dashboard **Fleet** page shows drone 3's status as
   `Maintenance` with health `Critical`.
5. The `maintenance_log` table gains an open row (`resolved_at IS NULL`) with
   `battery_pct_at_trigger` below 15.
6. **Repair**: on the Fleet page, click **Repair** for that drone → status
   returns to `Idle`, battery resets to 100, and the open log row gets
   `resolved_at`.

## Step 5 — Mongo aggregations (admin analytics)

1. As grid admin, go to **Analytics**.
2. **Average Delivery Time per Zone** — table of zones with avg/max delivery
   minutes, computed by the `avgDeliveryTimePerZone` pipeline
   (`db/mongo/aggregations.js`).
3. **Weather Interference per Zone** — zones ranked by interference score
   (wind + deviation), from the `weatherInterferencePerZone` pipeline.
4. **Battery Drain per Zone / Hour** — lowest-average-battery zones first, from
   the `batteryDrainPerZoneHour` pipeline (`$facet` computing by-zone and
   by-hour rollups).

Endpoint: `GET /api/analytics?pipeline=avg_delivery_time_per_zone` (and the
other two pipeline names).

## Step 6 — Views-driven dashboard

1. Admin **Dashboard** reads from `active_fleet_view`:
   - drone_id, serial_no, model, status, battery_pct, home zone, current order,
     last_seen_at, computed health (OK/Low/Critical).
2. Zone summary reads from `zone_fleet_summary_view` (drone counts by status per
   zone).
3. The dashboard refreshes every few seconds; live Mongo telemetry is merged
   into tracking pages via `/api/telemetry/by-drone`.

## Step 7 — Role-based access (customer isolation)

1. Log in as customer `rahul.sharma@email.com`.
2. Try to open `/admin/dashboard` or call `/api/fleet/active` → 403 Forbidden
   (middleware + handler role check).
3. In **My Orders**, every order's `customer_id` equals the logged-in user's id
   — enforcement happens in SQL (`WHERE o.customer_id = $1`), not just the UI.

## Step 8 — System health

1. Admin **System Health** shows Postgres and Mongo connectivity + latency.
2. Recent failed payments and open maintenance logs are listed.

---

Exit criteria for a successful demo:
- Order placement works atomically; forced failure leaves zero residue.
- Concurrent orders never double-assign a drone.
- Low-battery telemetry flips Postgres to `Maintenance` + creates a log row,
  visible on the admin dashboard.
- Aggregations return correct results on seeded data.
- Customers cannot reach admin routes or other customers' orders.