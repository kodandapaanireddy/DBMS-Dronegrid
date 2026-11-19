-- =============================================================================
-- Urban Drone Logistics DBMS — Seed Data (Phase 1)
-- =============================================================================
-- This file inserts realistic seed data into the schema.
-- Run after schema.sql: psql -v ON_ERROR_STOP=1 -f seed.sql
-- Deterministic: setseed(0.42) called before any random() calls.
-- =============================================================================

BEGIN;

-- Set deterministic seed for all random() calls in this transaction
SELECT setseed(0.42);

-- =============================================================================
-- 1. DRONE MODELS (4 rows)
-- =============================================================================

INSERT INTO drone_models (name, max_payload_kg, max_range_km, battery_capacity_mah) VALUES
    ('Light Courier',   2.00, 15.00, 5000),
    ('Standard Hauler', 5.00, 25.00, 8000),
    ('Heavy Lifter',   10.00, 30.00, 12000),
    ('Express Scout',   1.00, 20.00, 4000);

-- =============================================================================
-- 2. GRID ZONES (40 rows: BLR-Z01 through BLR-Z40)
-- =============================================================================

INSERT INTO grid_zones (zone_code, name, center_lat, center_lng, radius_km) VALUES
    ('BLR-Z01', 'Indiranagar',       12.9781, 77.6404, 3),
    ('BLR-Z02', 'Koramangala',       12.9287, 77.6271, 3),
    ('BLR-Z03', 'Whitefield',        12.9694, 77.6667, 3),
    ('BLR-Z04', 'Electronic City',   12.9339, 77.6731, 3),
    ('BLR-Z05', 'Hebbal',            12.9735, 77.6376, 3),
    ('BLR-Z06', 'Jayanagar',         12.9352, 77.5990, 3),
    ('BLR-Z07', 'Yelahanka',         13.0879, 77.5962, 3),
    ('BLR-Z08', 'HSR Layout',        12.9392, 77.6377, 3),
    ('BLR-Z09', 'Marathahalli',      12.9558, 77.6538, 3),
    ('BLR-Z10', 'Rajajinagar',       13.0020, 77.5781, 3),
    ('BLR-Z11', 'Banashankari',      12.9434, 77.5943, 3),
    ('BLR-Z12', 'Malleshwaram',      13.0037, 77.5746, 3),
    ('BLR-Z13', 'Sadashivnagar',     12.9848, 77.5963, 3),
    ('BLR-Z14', 'Kumaraswamy Layout',12.9386, 77.6215, 3),
    ('BLR-Z15', 'BTM Layout',        12.9319, 77.6200, 3),
    ('BLR-Z16', 'JP Nagar',          12.9240, 77.5800, 3),
    ('BLR-Z17', 'Vijayanagar',       12.9347, 77.6286, 3),
    ('BLR-Z18', 'Wilson Garden',     12.9415, 77.6112, 3),
    ('BLR-Z19', 'Basavanagudi',      12.9304, 77.5853, 3),
    ('BLR-Z20', 'Bannerghatta',      12.9228, 77.6022, 3),
    ('BLR-Z21', 'Arekere',           12.9269, 77.5948, 3),
    ('BLR-Z22', 'Chikkajala',        13.0162, 77.6007, 3),
    ('BLR-Z23', 'Dunasandra',        13.0247, 77.6147, 3),
    ('BLR-Z24', 'Varthur',           12.9713, 77.7022, 3),
    ('BLR-Z25', 'Kundalahalli',      12.9711, 77.6933, 3),
    ('BLR-Z26', 'Kadubeesanahalli',  12.9673, 77.6881, 3),
    ('BLR-Z27', 'Bellandur',         12.9711, 77.7430, 3),
    ('BLR-Z28', 'HAL Museum',        12.9706, 77.6793, 3),
    ('BLR-Z29', 'Suranjan Das Road', 12.9694, 77.6727, 3),
    ('BLR-Z30', 'Thippasandra',      12.9616, 77.6603, 3),
    ('BLR-Z31', 'Gandhi Nagar',      12.9757, 77.6133, 3),
    ('BLR-Z32', 'Richmond Town',     12.9718, 77.6065, 3),
    ('BLR-Z33', 'Cox Town',          12.9776, 77.6022, 3),
    ('BLR-Z34', 'Cooke Town',        12.9806, 77.6069, 3),
    ('BLR-Z35', 'Benson Town',       12.9824, 77.6042, 3),
    ('BLR-Z36', 'Lingarajapuram',    13.0078, 77.6363, 3),
    ('BLR-Z37', 'Sivancheti Gardens',13.0089, 77.6297, 3),
    ('BLR-Z38', 'Kaggadasapura',     13.0050, 77.6453, 3),
    ('BLR-Z39', 'Krishnarajapuram',  12.9833, 77.6711, 3),
    ('BLR-Z40', 'Ramamurthy Nagar',  13.0135, 77.6399, 3);

-- =============================================================================
-- 3. USERS (11 rows)
-- =============================================================================

INSERT INTO users (name, email, password_hash, role, created_at) VALUES
    ('Grid Administrator', 'admin@dronegrid.in', crypt('Admin@123', gen_salt('bf', 10)), 'grid_admin', NOW() - INTERVAL '30 days'),
    ('Rahul Sharma',       'rahul.sharma@email.com', crypt('Customer@123', gen_salt('bf', 10)), 'customer', NOW() - INTERVAL '25 days'),
    ('Priya Patel',        'priya.patel@email.com', crypt('Customer@123', gen_salt('bf', 10)), 'customer', NOW() - INTERVAL '22 days'),
    ('Amit Kumar',         'amit.kumar@email.com', crypt('Customer@123', gen_salt('bf', 10)), 'customer', NOW() - INTERVAL '20 days'),
    ('Sneha Reddy',        'sneha.reddy@email.com', crypt('Customer@123', gen_salt('bf', 10)), 'customer', NOW() - INTERVAL '18 days'),
    ('Vikram Singh',       'vikram.singh@email.com', crypt('Customer@123', gen_salt('bf', 10)), 'customer', NOW() - INTERVAL '15 days'),
    ('Ananya Iyer',        'ananya.iyer@email.com', crypt('Customer@123', gen_salt('bf', 10)), 'customer', NOW() - INTERVAL '12 days'),
    ('Karthik Nair',       'karthik.nair@email.com', crypt('Customer@123', gen_salt('bf', 10)), 'customer', NOW() - INTERVAL '10 days'),
    ('Deepa Venkatesh',    'deepa.venkatesh@email.com', crypt('Customer@123', gen_salt('bf', 10)), 'customer', NOW() - INTERVAL '8 days'),
    ('Suresh Babu',        'suresh.babu@email.com', crypt('Customer@123', gen_salt('bf', 10)), 'customer', NOW() - INTERVAL '5 days'),
    ('Meera Joshi',        'meera.joshi@email.com', crypt('Customer@123', gen_salt('bf', 10)), 'customer', NOW() - INTERVAL '3 days');

-- =============================================================================
-- 4. DRONES (30 rows)
-- =============================================================================

INSERT INTO drones (serial_no, model_id, status, battery_pct, home_zone_id, last_seen_at)
SELECT
    'DRN-BLR-' || LPAD(g::text, 4, '0') AS serial_no,
    (SELECT model_id FROM drone_models ORDER BY model_id LIMIT 1 OFFSET ((g - 1) % 4)) AS model_id,
    CASE
        WHEN g <= 3 THEN 'Maintenance'::drone_status
        WHEN g BETWEEN 4 AND 7 THEN 'Charging'::drone_status
        WHEN g BETWEEN 8 AND 11 THEN 'Assigned'::drone_status
        WHEN g BETWEEN 12 AND 15 THEN 'In_Flight'::drone_status
        ELSE 'Idle'::drone_status
    END AS status,
    CASE
        WHEN g <= 3 THEN 5 + floor(random() * 10)::int
        WHEN g BETWEEN 4 AND 7 THEN 10 + floor(random() * 41)::int
        WHEN g BETWEEN 8 AND 11 THEN 40 + floor(random() * 61)::int
        WHEN g BETWEEN 12 AND 15 THEN 30 + floor(random() * 71)::int
        ELSE 60 + floor(random() * 41)::int
    END AS battery_pct,
    (SELECT zone_id FROM grid_zones ORDER BY zone_id LIMIT 1 OFFSET ((g - 1) % 40)) AS home_zone_id,
    CASE
        WHEN g <= 3 THEN NOW() - INTERVAL '3 hours'
        ELSE NOW() - (floor(random() * 5) || ' minutes')::interval
    END AS last_seen_at
FROM generate_series(1, 30) AS g;

-- =============================================================================
-- 5. SYSTEM CONFIG
-- =============================================================================

INSERT INTO system_config (config_key, config_value, description, updated_at) VALUES
    ('battery_critical_threshold', '15', 'Battery % below which drone status becomes Maintenance', NOW()),
    ('battery_low_threshold', '30', 'Battery % below which drone should charge', NOW()),
    ('min_battery_for_assignment', '40', 'Minimum battery % required for order assignment', NOW()),
    ('tax_rate_pct', '18', 'GST tax rate as percentage (inclusive pricing', NOW()),
    ('base_fare_inr', '49', 'Base fare in INR for all orders', NOW()),
    ('per_km_rate_inr', '12', 'Per-kilometer rate in INR for distance beyond base fare', NOW());

-- =============================================================================
-- 6. ORDERS (200 rows)
-- =============================================================================

-- Step 1: Insert Delivered orders (170)
INSERT INTO orders (customer_id, drone_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, zone_id, weight_kg, status, created_at, delivered_at)
SELECT
    (SELECT user_id FROM users WHERE role = 'customer' ORDER BY user_id LIMIT 1 OFFSET floor(random() * 10)) AS customer_id,
    (SELECT drone_id FROM drones ORDER BY drone_id LIMIT 1 OFFSET floor(random() * 30)) AS drone_id,
    12.83 + random() * (13.14 - 12.83) AS pickup_lat,
    77.46 + random() * (77.75 - 77.46) AS pickup_lng,
    12.83 + random() * (13.14 - 12.83) AS dropoff_lat,
    77.46 + random() * (77.75 - 77.46) AS dropoff_lng,
    (SELECT zone_id FROM grid_zones ORDER BY zone_id LIMIT 1 OFFSET floor(random() * 40)) AS zone_id,
    LEAST(
        ROUND((0.3 + random() * 4.7)::numeric, 2),
        (SELECT dm.max_payload_kg FROM drone_models dm WHERE dm.model_id = (SELECT model_id FROM drones ORDER BY drone_id LIMIT 1 OFFSET floor(random() * 30)))
    ) AS weight_kg,
    'Delivered'::order_status AS status,
    t.created_at,
    t.created_at + (10 + floor(random() * 36)) * interval '1 minute' AS delivered_at
FROM (
    SELECT (NOW() - (floor(random() * 60) || ' days')::interval - (floor(random() * 1440) || ' minutes')::interval) AS created_at
    FROM generate_series(1, 170)
) t;

-- Step 2: Insert Cancelled orders (12)
INSERT INTO orders (customer_id, drone_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, zone_id, weight_kg, status, created_at, delivered_at)
SELECT
    (SELECT user_id FROM users WHERE role = 'customer' ORDER BY user_id LIMIT 1 OFFSET floor(random() * 10)) AS customer_id,
    NULL AS drone_id,
    12.83 + random() * (13.14 - 12.83) AS pickup_lat,
    77.46 + random() * (77.75 - 77.46) AS pickup_lng,
    12.83 + random() * (13.14 - 12.83) AS dropoff_lat,
    77.46 + random() * (77.75 - 77.46) AS dropoff_lng,
    (SELECT zone_id FROM grid_zones ORDER BY zone_id LIMIT 1 OFFSET floor(random() * 40)) AS zone_id,
    ROUND((0.3 + random() * 1.7)::numeric, 2) AS weight_kg,
    'Cancelled'::order_status AS status,
    NOW() - (floor(random() * 60) || ' days')::interval - (floor(random() * 1440) || ' minutes')::interval AS created_at,
    NULL AS delivered_at
FROM generate_series(1, 12);

-- Step 3: Insert Failed orders (6)
INSERT INTO orders (customer_id, drone_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, zone_id, weight_kg, status, created_at, delivered_at)
SELECT
    (SELECT user_id FROM users WHERE role = 'customer' ORDER BY user_id LIMIT 1 OFFSET floor(random() * 10)) AS customer_id,
    NULL AS drone_id,
    12.83 + random() * (13.14 - 12.83) AS pickup_lat,
    77.46 + random() * (77.75 - 77.46) AS pickup_lng,
    12.83 + random() * (13.14 - 12.83) AS dropoff_lat,
    77.46 + random() * (77.75 - 77.46) AS dropoff_lng,
    (SELECT zone_id FROM grid_zones ORDER BY zone_id LIMIT 1 OFFSET floor(random() * 40)) AS zone_id,
    ROUND((0.3 + random() * 1.7)::numeric, 2) AS weight_kg,
    'Failed'::order_status AS status,
    NOW() - (floor(random() * 60) || ' days')::interval - (floor(random() * 1440) || ' minutes')::interval AS created_at,
    NULL AS delivered_at
FROM generate_series(1, 6);

-- Step 4: Insert Assigned orders (4)
INSERT INTO orders (customer_id, drone_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, zone_id, weight_kg, status, created_at, delivered_at)
SELECT
    (SELECT user_id FROM users WHERE role = 'customer' ORDER BY user_id LIMIT 1 OFFSET (g-1)) AS customer_id,
    (SELECT drone_id FROM drones WHERE status = 'Assigned' ORDER BY drone_id LIMIT 1 OFFSET (g-1)) AS drone_id,
    (SELECT center_lat FROM grid_zones WHERE zone_id = (SELECT home_zone_id FROM drones WHERE drone_id = (SELECT drone_id FROM drones WHERE status = 'Assigned' ORDER BY drone_id LIMIT 1 OFFSET (g-1)))) + (random() * 0.01 - 0.005) AS pickup_lat,
    (SELECT center_lng FROM grid_zones WHERE zone_id = (SELECT home_zone_id FROM drones WHERE drone_id = (SELECT drone_id FROM drones WHERE status = 'Assigned' ORDER BY drone_id LIMIT 1 OFFSET (g-1)))) + (random() * 0.01 - 0.005) AS pickup_lng,
    12.83 + random() * (13.14 - 12.83) AS dropoff_lat,
    77.46 + random() * (77.75 - 77.46) AS dropoff_lng,
    (SELECT home_zone_id FROM drones WHERE drone_id = (SELECT drone_id FROM drones WHERE status = 'Assigned' ORDER BY drone_id LIMIT 1 OFFSET (g-1))) AS zone_id,
    ROUND((0.3 + random() * 1.7)::numeric, 2) AS weight_kg,
    'Assigned'::order_status AS status,
    NOW() - (floor(random() * 5) || ' minutes')::interval AS created_at,
    NULL AS delivered_at
FROM generate_series(1, 4) AS g;

-- Step 5: Insert In_Transit orders (4)
INSERT INTO orders (customer_id, drone_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, zone_id, weight_kg, status, created_at, delivered_at)
SELECT
    (SELECT user_id FROM users WHERE role = 'customer' ORDER BY user_id LIMIT 1 OFFSET (g+3)) AS customer_id,
    (SELECT drone_id FROM drones WHERE status = 'In_Flight' ORDER BY drone_id LIMIT 1 OFFSET (g-1)) AS drone_id,
    (SELECT center_lat FROM grid_zones WHERE zone_id = (SELECT home_zone_id FROM drones WHERE drone_id = (SELECT drone_id FROM drones WHERE status = 'In_Flight' ORDER BY drone_id LIMIT 1 OFFSET (g-1)))) + (random() * 0.01 - 0.005) AS pickup_lat,
    (SELECT center_lng FROM grid_zones WHERE zone_id = (SELECT home_zone_id FROM drones WHERE drone_id = (SELECT drone_id FROM drones WHERE status = 'In_Flight' ORDER BY drone_id LIMIT 1 OFFSET (g-1)))) + (random() * 0.01 - 0.005) AS pickup_lng,
    12.83 + random() * (13.14 - 12.83) AS dropoff_lat,
    77.46 + random() * (77.75 - 77.46) AS dropoff_lng,
    (SELECT home_zone_id FROM drones WHERE drone_id = (SELECT drone_id FROM drones WHERE status = 'In_Flight' ORDER BY drone_id LIMIT 1 OFFSET (g-1))) AS zone_id,
    ROUND((0.3 + random() * 1.7)::numeric, 2) AS weight_kg,
    'In_Transit'::order_status AS status,
    NOW() - (floor(random() * 30) || ' minutes')::interval AS created_at,
    NULL AS delivered_at
FROM generate_series(1, 4) AS g;

-- Step 6: Insert Pending orders (4)
INSERT INTO orders (customer_id, drone_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, zone_id, weight_kg, status, created_at, delivered_at)
SELECT
    (SELECT user_id FROM users WHERE role = 'customer' ORDER BY user_id LIMIT 1 OFFSET floor(random() * 10)) AS customer_id,
    NULL AS drone_id,
    12.83 + random() * (13.14 - 12.83) AS pickup_lat,
    77.46 + random() * (77.75 - 77.46) AS pickup_lng,
    12.83 + random() * (13.14 - 12.83) AS dropoff_lat,
    77.46 + random() * (77.75 - 77.46) AS dropoff_lng,
    (SELECT zone_id FROM grid_zones ORDER BY zone_id LIMIT 1 OFFSET floor(random() * 40)) AS zone_id,
    ROUND((0.3 + random() * 4.7)::numeric, 2) AS weight_kg,
    'Pending'::order_status AS status,
    NOW() - (floor(random() * 2) || ' hours')::interval AS created_at,
    NULL AS delivered_at
FROM generate_series(1, 4) AS g;

-- =============================================================================
-- 7. PAYMENTS (200 rows)
-- =============================================================================

-- Delivered orders (170): Captured
INSERT INTO payments (order_id, amount, currency, status, method, created_at)
SELECT
    o.order_id,
    ROUND((49 + 12 * (
        6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS((o.dropoff_lat - o.pickup_lat) / 2)), 2) +
            COS(RADIANS(o.pickup_lat)) * COS(RADIANS(o.dropoff_lat)) *
            POWER(SIN(RADIANS((o.dropoff_lng - o.pickup_lng) / 2)), 2)
        ))
    ))::numeric, 2) AS amount,
    'INR'::char(3) AS currency,
    'Captured'::payment_status AS status,
    (ARRAY['UPI', 'Card', 'NetBanking', 'Wallet'])[((o.order_id - 1) % 4) + 1] AS method,
    o.created_at AS created_at
FROM orders o
WHERE o.status = 'Delivered';

-- Cancelled orders (12): 10 Refunded, 2 Failed
INSERT INTO payments (order_id, amount, currency, status, method, created_at)
SELECT
    o.order_id,
    ROUND((49 + 12 * (
        6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS((o.dropoff_lat - o.pickup_lat) / 2)), 2) +
            COS(RADIANS(o.pickup_lat)) * COS(RADIANS(o.dropoff_lat)) *
            POWER(SIN(RADIANS((o.dropoff_lng - o.pickup_lng) / 2)), 2)
        ))
    ))::numeric, 2) AS amount,
    'INR'::char(3) AS currency,
    CASE WHEN rn <= 10 THEN 'Refunded'::payment_status ELSE 'Failed'::payment_status END AS status,
    (ARRAY['UPI', 'Card', 'NetBanking', 'Wallet'])[((o.order_id - 1) % 4) + 1] AS method,
    o.created_at AS created_at
FROM (
    SELECT o.*, ROW_NUMBER() OVER (ORDER BY o.order_id) AS rn
    FROM orders o
    WHERE o.status = 'Cancelled'
) o;

-- Failed orders (6): Failed
INSERT INTO payments (order_id, amount, currency, status, method, created_at)
SELECT
    o.order_id,
    ROUND((49 + 12 * (
        6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS((o.dropoff_lat - o.pickup_lat) / 2)), 2) +
            COS(RADIANS(o.pickup_lat)) * COS(RADIANS(o.dropoff_lat)) *
            POWER(SIN(RADIANS((o.dropoff_lng - o.pickup_lng) / 2)), 2)
        ))
    ))::numeric, 2) AS amount,
    'INR'::char(3) AS currency,
    'Failed'::payment_status AS status,
    (ARRAY['UPI', 'Card', 'NetBanking', 'Wallet'])[((o.order_id - 1) % 4) + 1] AS method,
    o.created_at AS created_at
FROM orders o
WHERE o.status = 'Failed';

-- Assigned orders (4): Captured
INSERT INTO payments (order_id, amount, currency, status, method, created_at)
SELECT
    o.order_id,
    ROUND((49 + 12 * (
        6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS((o.dropoff_lat - o.pickup_lat) / 2)), 2) +
            COS(RADIANS(o.pickup_lat)) * COS(RADIANS(o.dropoff_lat)) *
            POWER(SIN(RADIANS((o.dropoff_lng - o.pickup_lng) / 2)), 2)
        ))
    ))::numeric, 2) AS amount,
    'INR'::char(3) AS currency,
    'Captured'::payment_status AS status,
    (ARRAY['UPI', 'Card', 'NetBanking', 'Wallet'])[((o.order_id - 1) % 4) + 1] AS method,
    o.created_at AS created_at
FROM orders o
WHERE o.status = 'Assigned';

-- In_Transit orders (4): Captured
INSERT INTO payments (order_id, amount, currency, status, method, created_at)
SELECT
    o.order_id,
    ROUND((49 + 12 * (
        6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS((o.dropoff_lat - o.pickup_lat) / 2)), 2) +
            COS(RADIANS(o.pickup_lat)) * COS(RADIANS(o.dropoff_lat)) *
            POWER(SIN(RADIANS((o.dropoff_lng - o.pickup_lng) / 2)), 2)
        ))
    ))::numeric, 2) AS amount,
    'INR'::char(3) AS currency,
    'Captured'::payment_status AS status,
    (ARRAY['UPI', 'Card', 'NetBanking', 'Wallet'])[((o.order_id - 1) % 4) + 1] AS method,
    o.created_at AS created_at
FROM orders o
WHERE o.status = 'In_Transit';

-- Pending orders (4): Pending
INSERT INTO payments (order_id, amount, currency, status, method, created_at)
SELECT
    o.order_id,
    0 AS amount,
    'INR'::char(3) AS currency,
    'Pending'::payment_status AS status,
    (ARRAY['UPI', 'Card', 'NetBanking', 'Wallet'])[((o.order_id - 1) % 4) + 1] AS method,
    o.created_at AS created_at
FROM orders o
WHERE o.status = 'Pending';

-- =============================================================================
-- 8. INVOICES (one per Captured or Refunded payment)
-- =============================================================================

INSERT INTO invoices (order_id, customer_id, total, tax, issued_at)
SELECT
    p.order_id,
    o.customer_id AS customer_id,
    p.amount AS total,
    ROUND((p.amount * 18.0 / 118.0)::numeric, 2) AS tax,
    p.created_at AS issued_at
FROM payments p
JOIN orders o ON o.order_id = p.order_id
WHERE p.status IN ('Captured', 'Refunded');

-- Step 9: Maintenance Log (8-10 rows)
INSERT INTO maintenance_log (drone_id, reason, battery_pct_at_trigger, triggered_at, resolved_at)
SELECT
    d.drone_id,
    CASE
        WHEN d.drone_id = (SELECT drone_id FROM drones ORDER BY drone_id LIMIT 1) THEN 'Battery degraded below critical threshold — cell 3 showed swelling'
        WHEN d.drone_id = (SELECT drone_id FROM drones ORDER BY drone_id LIMIT 1 OFFSET 1) THEN 'Voltage regulator failure detected during routine check'
        WHEN d.drone_id = (SELECT drone_id FROM drones ORDER BY drone_id LIMIT 1 OFFSET 2) THEN 'Motor controller overheating; thermal fuse blown'
    END AS reason,
    d.battery_pct AS battery_pct_at_trigger,
    d.last_seen_at AS triggered_at,
    NULL AS resolved_at
FROM drones d
WHERE d.drone_id IN (SELECT drone_id FROM drones ORDER BY drone_id LIMIT 3);

INSERT INTO maintenance_log (drone_id, reason, battery_pct_at_trigger, triggered_at, resolved_at)
SELECT
    d.drone_id,
    'Routine maintenance and calibration' AS reason,
    d.battery_pct AS battery_pct_at_trigger,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '28 days'
FROM drones d
WHERE d.drone_id IN (SELECT drone_id FROM drones ORDER BY drone_id LIMIT 1 OFFSET 3);
-- Note: I'll add a few more resolved logs manually using offsets to ensure they exist.
INSERT INTO maintenance_log (drone_id, reason, battery_pct_at_trigger, triggered_at, resolved_at)
SELECT
    (SELECT drone_id FROM drones ORDER BY drone_id LIMIT 1 OFFSET 5),
    'Propeller replacement',
    15,
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '40 days'
UNION ALL
SELECT
    (SELECT drone_id FROM drones ORDER BY drone_id LIMIT 1 OFFSET 10),
    'Firmware update failure',
    20,
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '58 days'
UNION ALL
SELECT
    (SELECT drone_id FROM drones ORDER BY drone_id LIMIT 1 OFFSET 15),
    'Sensor recalibration',
    25,
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '88 days'
UNION ALL
SELECT
    (SELECT drone_id FROM drones ORDER BY drone_id LIMIT 1 OFFSET 20),
    'Battery cell balance issue',
    12,
    NOW() - INTERVAL '75 days',
    NOW() - INTERVAL '70 days'
UNION ALL
SELECT
    (SELECT drone_id FROM drones ORDER BY drone_id LIMIT 1 OFFSET 25),
    'Motor bearing wear',
    14,
    NOW() - INTERVAL '100 days',
    NOW() - INTERVAL '95 days';

COMMIT;
