-- =============================================================================
-- Urban Drone Logistics DBMS — Views (Phase 2)
-- =============================================================================
-- Run AFTER schema.sql and seed.sql:
--   psql -v ON_ERROR_STOP=1 -f views.sql
--
-- Idempotent: views are dropped (CREATE OR REPLACE) before recreation.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- active_fleet_view
--   drone_id, serial_no, model, status, battery_pct, home zone,
--   current order_id and status (LEFT JOIN), last_seen_at,
--   computed health column: OK / Low / Critical
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW active_fleet_view AS
SELECT
    d.drone_id,
    d.serial_no,
    dm.name AS model,
    d.status,
    d.battery_pct,
    gz.zone_code AS home_zone,
    o.order_id AS current_order_id,
    o.status AS current_order_status,
    d.last_seen_at,
    CASE
        WHEN d.battery_pct < (SELECT COALESCE((SELECT config_value::int
                                           FROM system_config
                                           WHERE config_key = 'battery_critical_threshold'), 15))
             THEN 'Critical'
        WHEN d.battery_pct < (SELECT COALESCE((SELECT config_value::int
                                           FROM system_config
                                           WHERE config_key = 'battery_low_threshold'), 30))
             THEN 'Low'
        ELSE 'OK'
    END AS health
FROM drones d
JOIN drone_models dm ON dm.model_id = d.model_id
LEFT JOIN grid_zones gz ON gz.zone_id = d.home_zone_id
LEFT JOIN orders o ON o.drone_id = d.drone_id
   AND o.status IN ('Assigned', 'In_Transit');

-- ---------------------------------------------------------------------------
-- zone_fleet_summary_view — drone counts by status per zone
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW zone_fleet_summary_view AS
SELECT
    gz.zone_code,
    gz.name AS zone_name,
    d.status,
    COUNT(d.drone_id) AS drone_count,
    ROUND(AVG(d.battery_pct)::numeric, 1) AS avg_battery_pct
FROM grid_zones gz
LEFT JOIN drones d ON d.home_zone_id = gz.zone_id
GROUP BY gz.zone_code, gz.name, d.status
ORDER BY gz.zone_code, d.status;

-- ---------------------------------------------------------------------------
-- order_payment_summary_view — one row per order with payment & invoice
--   (convenience for order history / tracking pages)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW order_payment_summary_view AS
SELECT
    o.order_id,
    u.name AS customer_name,
    o.status AS order_status,
    o.created_at,
    o.delivered_at,
    o.weight_kg,
    p.payment_id,
    p.amount,
    p.status AS payment_status,
    p.method,
    i.invoice_id,
    i.total AS invoice_total,
    i.tax AS invoice_tax
FROM orders o
JOIN users u ON u.user_id = o.customer_id
LEFT JOIN payments p ON p.order_id = o.order_id
LEFT JOIN invoices i ON i.order_id = o.order_id;

-- =============================================================================
-- END OF VIEWS
-- =============================================================================