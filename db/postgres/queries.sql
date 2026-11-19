-- =============================================================================
-- Urban Drone Logistics DBMS — Common Queries (Phase 2)
-- =============================================================================
-- These queries are used by the Next.js API handlers via the pg driver.
-- =============================================================================

-- Q1: Customers only see their own orders (enforced in SQL).
SELECT o.order_id, o.status, o.created_at, o.delivered_at, o.weight_kg,
       p.amount, p.status AS payment_status
FROM orders o
LEFT JOIN payments p ON p.order_id = o.order_id
WHERE o.customer_id = $1
ORDER BY o.created_at DESC;

-- Q2: Active fleet view (dashboard source).
SELECT * FROM active_fleet_view ORDER BY drone_id;

-- Q3: Zone fleet summary.
SELECT * FROM zone_fleet_summary_view ORDER BY zone_code;

-- Q4: Drones needing maintenance (battery below critical threshold).
SELECT drone_id, serial_no, status, battery_pct, home_zone_id
FROM drones
WHERE battery_pct < (SELECT COALESCE((SELECT config_value::int
                                    FROM system_config
                                    WHERE config_key = 'battery_critical_threshold'), 15))
ORDER BY battery_pct ASC;

-- Q5: Failed payments (admin health panel).
SELECT p.payment_id, p.order_id, p.amount, p.method, p.created_at, u.name AS customer
FROM payments p
JOIN orders o ON o.order_id = p.order_id
JOIN users u ON u.user_id = o.customer_id
WHERE p.status = 'Failed'
ORDER BY p.created_at DESC;

-- Q6: Open maintenance logs.
SELECT ml.log_id, ml.drone_id, d.serial_no, ml.reason, ml.battery_pct_at_trigger,
       ml.triggered_at
FROM maintenance_log ml
JOIN drones d ON d.drone_id = ml.drone_id
WHERE ml.resolved_at IS NULL
ORDER BY ml.triggered_at DESC;

-- Q7: Drone telemetry sync target (for the ingestion service).
SELECT drone_id, status, battery_pct, home_zone_id, last_seen_at
FROM drones
WHERE drone_id = $1;

-- Q8: Customer total spend (completed orders).
SELECT u.name, u.email,
       COUNT(i.invoice_id) AS invoice_count,
       SUM(i.total) AS total_spent
FROM users u
LEFT JOIN invoices i ON i.customer_id = u.user_id
WHERE u.role = 'customer'
GROUP BY u.user_id, u.name, u.email;