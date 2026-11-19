-- =============================================================================
-- Urban Drone Logistics DBMS — Transactions (Phase 2)
-- =============================================================================
-- Run AFTER schema.sql, seed.sql, triggers.sql:
--   psql -v ON_ERROR_STOP=1 -f transactions.sql
--
-- Idempotent: functions are dropped (CREATE OR REPLACE) before recreation.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: Haversine distance (km) between two lat/lng points.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION haversine_km(lat1 double precision, lng1 double precision,
                                        lat2 double precision, lng2 double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT 6371 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS((lat2 - lat1) / 2)), 2) +
        COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
        POWER(SIN(RADIANS((lng2 - lng1) / 2)), 2)
    ));
$$;

-- ---------------------------------------------------------------------------
-- place_order — ONE ATOMIC UNIT OF WORK
--   1. Lock and pick the nearest available drone
--      (status='Idle', battery >= threshold, payload capacity OK)
--      using SELECT ... FOR UPDATE SKIP LOCKED.
--   2. Insert the order.
--   3. Insert + capture the payment.
--   4. Update the drone to 'Assigned'.
--   5. Insert the invoice.
--   If ANY step fails, the whole transaction rolls back.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION place_order(
    p_customer_id    integer,
    p_pickup_lat     double precision,
    p_pickup_lng     double precision,
    p_dropoff_lat    double precision,
    p_dropoff_lng    double precision,
    p_zone_id        integer,
    p_weight_kg      double precision,
    p_method         varchar,
    p_force_failure  boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_threshold      integer;
    v_drone_id       integer;
    v_model_id       integer;
    v_max_payload    numeric;
    v_dist_km        double precision;
    v_amount         numeric(10,2);
    v_tax_rate       numeric;
    v_tax            numeric(10,2);
    v_order_id       integer;
BEGIN
    -- Read configuration once (default 40).
    v_threshold := COALESCE(
        (SELECT config_value::int FROM system_config WHERE config_key = 'min_battery_for_assignment'),
        40
    );
    v_tax_rate := COALESCE(
        (SELECT config_value::numeric FROM system_config WHERE config_key = 'tax_rate_pct'),
        18
    );

    -- Step 1: Lock and pick the nearest available drone.
    -- FOR UPDATE SKIP LOCKED guarantees concurrent callers never double-assign.
    SELECT d.drone_id, d.model_id, dm.max_payload_kg,
           haversine_km(p_pickup_lat, p_pickup_lng,
                        gz.center_lat, gz.center_lng) AS dist_km
    INTO v_drone_id, v_model_id, v_max_payload, v_dist_km
    FROM drones d
    JOIN drone_models dm ON dm.model_id = d.model_id
    JOIN grid_zones gz ON gz.zone_id = d.home_zone_id
    WHERE d.status = 'Idle'
      AND d.battery_pct >= v_threshold
      AND dm.max_payload_kg >= p_weight_kg
    ORDER BY haversine_km(p_pickup_lat, p_pickup_lng,
                          gz.center_lat, gz.center_lng) ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_drone_id IS NULL THEN
        RAISE EXCEPTION 'No available drone for this order';
    END IF;

    -- Step 2: Insert the order.
    INSERT INTO orders (customer_id, drone_id, pickup_lat, pickup_lng,
                        dropoff_lat, dropoff_lng, zone_id, weight_kg,
                        status, created_at)
    VALUES (p_customer_id, v_drone_id, p_pickup_lat, p_pickup_lng,
            p_dropoff_lat, p_dropoff_lng, p_zone_id, p_weight_kg,
            'Assigned', NOW())
    RETURNING order_id INTO v_order_id;

    -- Step 3: Insert and capture the payment.
    v_amount := ROUND((49 + 12 * v_dist_km)::numeric, 2);

    IF p_force_failure THEN
        RAISE EXCEPTION 'Simulated payment failure (forced)';
    END IF;

    INSERT INTO payments (order_id, amount, currency, status, method, created_at)
    VALUES (v_order_id, v_amount, 'INR', 'Captured', p_method, NOW());

    -- Step 4: Update the drone to 'Assigned'.
    UPDATE drones
    SET status = 'Assigned'
    WHERE drone_id = v_drone_id;

    -- Step 5: Insert the invoice (GST-inclusive tax at the configured rate).
    v_tax := ROUND((v_amount * v_tax_rate / (100 + v_tax_rate))::numeric, 2);

    INSERT INTO invoices (order_id, customer_id, total, tax, issued_at)
    VALUES (v_order_id, p_customer_id, v_amount, v_tax, NOW());

    RETURN v_order_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- repair_drone — Admin action: Maintenance → Idle with battery reset.
-- Resolves any open maintenance_log rows for the drone.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION repair_drone(p_drone_id integer, p_new_battery integer DEFAULT 100)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_new_battery < 0 OR p_new_battery > 100 THEN
        RAISE EXCEPTION 'battery must be between 0 and 100';
    END IF;

    UPDATE drones
    SET status = 'Idle', battery_pct = p_new_battery, last_seen_at = NOW()
    WHERE drone_id = p_drone_id;

    UPDATE maintenance_log
    SET resolved_at = NOW()
    WHERE drone_id = p_drone_id AND resolved_at IS NULL;

    RETURN TRUE;
END;
$$;

-- ---------------------------------------------------------------------------
-- capture_payment — Transition a Pending payment to Captured (or Failed).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION capture_payment(p_order_id integer, p_status payment_status DEFAULT 'Captured')
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_tax_rate numeric;
BEGIN
    UPDATE payments
    SET status = p_status
    WHERE order_id = p_order_id AND status = 'Pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment for order % is not Pending', p_order_id;
    END IF;

    -- Read the configured tax rate for invoice generation.
    v_tax_rate := COALESCE(
        (SELECT config_value::numeric FROM system_config WHERE config_key = 'tax_rate_pct'),
        18
    );

    -- Issue an invoice when the payment is captured or refunded.
    IF p_status IN ('Captured', 'Refunded') THEN
        INSERT INTO invoices (order_id, customer_id, total, tax, issued_at)
        SELECT p.order_id, o.customer_id, p.amount,
               ROUND((p.amount * v_tax_rate / (100 + v_tax_rate))::numeric, 2),
               NOW()
        FROM payments p
        JOIN orders o ON o.order_id = p.order_id
        WHERE p.order_id = p_order_id
          AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.order_id = p.order_id);
    END IF;

    RETURN TRUE;
END;
$$;

-- =============================================================================
-- END OF TRANSACTIONS
-- =============================================================================