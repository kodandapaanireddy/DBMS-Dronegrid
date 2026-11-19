-- =============================================================================
-- Urban Drone Logistics DBMS — PostgreSQL Schema (Phase 1)
-- =============================================================================
-- This schema is idempotent: it drops existing objects before creating new ones.
-- Run with: psql -v ON_ERROR_STOP=1 -f schema.sql
-- =============================================================================

-- Drop in reverse dependency order to avoid FK violations
DROP TABLE IF EXISTS maintenance_log CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS drones CASCADE;
DROP TABLE IF EXISTS grid_zones CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS drone_models CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS drone_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('customer', 'grid_admin');
CREATE TYPE drone_status AS ENUM ('Idle', 'Assigned', 'In_Flight', 'Charging', 'Maintenance');
CREATE TYPE order_status AS ENUM ('Pending', 'Assigned', 'In_Transit', 'Delivered', 'Cancelled', 'Failed');
CREATE TYPE payment_status AS ENUM ('Pending', 'Captured', 'Failed', 'Refunded');

-- =============================================================================
-- TABLE: users
-- =============================================================================

CREATE TABLE users (
    user_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Account holders in the drone delivery grid. Customers place orders; grid_admins manage the system.';

COMMENT ON COLUMN users.role IS 'Role of the user: either a customer or a grid administrator. Defaults to customer.';

COMMENT ON COLUMN users.email IS 'Email address. Must be a valid email format. Must be unique across the system.';

-- =============================================================================
-- TABLE: grid_zones
-- =============================================================================

CREATE TABLE grid_zones (
    zone_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    zone_code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    center_lat NUMERIC(9,6) NOT NULL,
    center_lng NUMERIC(9,6) NOT NULL,
    radius_km NUMERIC(5,2) DEFAULT 3
);

COMMENT ON TABLE grid_zones IS '3 km-spaced grid zones covering Bengaluru. Each zone has a center point and a 3 km radius. Zone codes are fixed as BLR-Z01 through BLR-Z40 for compatibility with the MongoDB phase.';

COMMENT ON COLUMN grid_zones.center_lat IS 'Latitude center of the zone in decimal degrees. Must be within Bengaluru bounds: 12.83 to 13.14.';

COMMENT ON COLUMN grid_zones.center_lng IS 'Longitude center of the zone in decimal degrees. Must be within Bengaluru bounds: 77.46 to 77.75.';

COMMENT ON COLUMN grid_zones.radius_km IS 'Radius of the zone in kilometers. Default is 3 km, matching the operational presence requirement.';

-- Constraint: Bengaluru lat/lng bounds
ALTER TABLE grid_zones ADD CONSTRAINT chk_grid_zones_lat_bound CHECK (center_lat >= 12.83 AND center_lat <= 13.14);
ALTER TABLE grid_zones ADD CONSTRAINT chk_grid_zones_lng_bound CHECK (center_lng >= 77.46 AND center_lng <= 77.75);
ALTER TABLE grid_zones ADD CONSTRAINT chk_grid_zones_radius_positive CHECK (radius_km > 0);

-- =============================================================================
-- TABLE: drone_models
-- =============================================================================

CREATE TABLE drone_models (
    model_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    max_payload_kg NUMERIC(6,2) NOT NULL,
    max_range_km NUMERIC(6,2) NOT NULL,
    battery_capacity_mah INTEGER NOT NULL
);

COMMENT ON TABLE drone_models IS 'Physical drone models available in the fleet. Each model defines payload limits, range, and battery capacity.';

COMMENT ON COLUMN drone_models.max_payload_kg IS 'Maximum payload the drone can carry in kilograms. All orders assigned to this model must not exceed this weight.';

COMMENT ON COLUMN drone_models.max_range_km IS 'Maximum flight range of the drone model in kilometers.';

COMMENT ON COLUMN drone_models.battery_capacity_mah IS 'Battery capacity in milliamp-hours. Determines how long the drone can fly before recharging.';

-- Constraint: all numeric columns must be positive
ALTER TABLE drone_models ADD CONSTRAINT chk_drone_models_max_payload_positive CHECK (max_payload_kg > 0);
ALTER TABLE drone_models ADD CONSTRAINT chk_drone_models_max_range_positive CHECK (max_range_km > 0);
ALTER TABLE drone_models ADD CONSTRAINT chk_drone_models_battery_capacity_positive CHECK (battery_capacity_mah > 0);

-- =============================================================================
-- TABLE: drones
-- =============================================================================

CREATE TABLE drones (
    drone_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    serial_no VARCHAR(20) UNIQUE NOT NULL,
    model_id INTEGER NOT NULL REFERENCES drone_models(model_id) ON DELETE RESTRICT,
    status drone_status DEFAULT 'Idle',
    battery_pct INTEGER NOT NULL,
    home_zone_id INTEGER REFERENCES grid_zones(zone_id) ON DELETE SET NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE drones IS 'Physical drones in the fleet. Each drone has a model, current status, battery level, and home zone.';

COMMENT ON COLUMN drones.serial_no IS 'Unique serial number of the drone, formatted as DRN-BLR-XXXX.';

COMMENT ON COLUMN drones.status IS 'Current operational status of the drone.';

COMMENT ON COLUMN drones.battery_pct IS 'Current battery level as a percentage (0–100).';

COMMENT ON COLUMN drones.home_zone_id IS 'The grid zone where this drone is based/homezed.';

COMMENT ON COLUMN drones.last_seen_at IS 'Timestamp of the last telemetry reading received from this drone.';

-- Constraint: battery percentage must be between 0 and 100
ALTER TABLE drones ADD CONSTRAINT chk_drones_battery_pct CHECK (battery_pct BETWEEN 0 AND 100);

-- Index on (status, battery_pct) for status+battery queries
CREATE INDEX idx_drones_status_battery ON drones(status, battery_pct);

-- Index on home_zone_id for zone-based queries
CREATE INDEX idx_drones_home_zone ON drones(home_zone_id);

-- =============================================================================
-- TABLE: orders
-- =============================================================================

CREATE TABLE orders (
    order_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    drone_id INTEGER REFERENCES drones(drone_id) ON DELETE SET NULL,
    pickup_lat NUMERIC(9,6) NOT NULL,
    pickup_lng NUMERIC(9,6) NOT NULL,
    dropoff_lat NUMERIC(9,6) NOT NULL,
    dropoff_lng NUMERIC(9,6) NOT NULL,
    zone_id INTEGER NOT NULL REFERENCES grid_zones(zone_id) ON DELETE RESTRICT,
    weight_kg NUMERIC(8,2) NOT NULL,
    status order_status DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

COMMENT ON TABLE orders IS 'Delivery orders placed by customers. Each order has a pickup and dropoff location, assigned drone (if any), and tracking status.';

COMMENT ON COLUMN orders.customer_id IS 'The customer who placed this order.';

COMMENT ON COLUMN orders.drone_id IS 'The drone assigned to this order. NULL if no drone is currently assigned. On DELETE SET NULL so orphaned orders remain valid.';

COMMENT ON COLUMN orders.zone_id IS 'The grid zone where the pickup location resides. Must match the zone of the pickup coordinates.';

COMMENT ON COLUMN orders.weight_kg IS 'Weight of the delivery payload in kilograms. Must not exceed the max_payload_kg of the assigned drone model.';

COMMENT ON COLUMN orders.status IS 'Current fulfillment status of the order.';

COMMENT ON COLUMN orders.created_at IS 'Timestamp when the order was created.';

COMMENT ON COLUMN orders.delivered_at IS 'Timestamp when the order was delivered. Must be NULL if status is not Delivered, and must be >= created_at.';

-- Constraint: coordinates must be within Bengaluru bounds
ALTER TABLE orders ADD CONSTRAINT chk_orders_pickup_lat CHECK (pickup_lat >= 12.83 AND pickup_lat <= 13.14);
ALTER TABLE orders ADD CONSTRAINT chk_orders_pickup_lng CHECK (pickup_lng >= 77.46 AND pickup_lng <= 77.75);
ALTER TABLE orders ADD CONSTRAINT chk_orders_dropoff_lat CHECK (dropoff_lat >= 12.83 AND dropoff_lat <= 13.14);
ALTER TABLE orders ADD CONSTRAINT chk_orders_dropoff_lng CHECK (dropoff_lng >= 77.46 AND dropoff_lng <= 77.75);

-- Constraint: weight must be positive
ALTER TABLE orders ADD CONSTRAINT chk_orders_weight_positive CHECK (weight_kg > 0);

-- Constraint: delivered_at is only set when status is Delivered, and must be >= created_at
ALTER TABLE orders ADD CONSTRAINT chk_orders_delivered_status CHECK (
    (status = 'Delivered' AND delivered_at IS NOT NULL) OR (status != 'Delivered' AND delivered_at IS NULL)
);
ALTER TABLE orders ADD CONSTRAINT chk_orders_delivered_after_created CHECK (
    delivered_at IS NULL OR delivered_at >= created_at
);

-- Indexes on FK and common filter columns
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_drone_id ON orders(drone_id);
CREATE INDEX idx_orders_zone_id ON orders(zone_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- =============================================================================
-- TABLE: payments
-- =============================================================================

CREATE TABLE payments (
    payment_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER UNIQUE NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'INR' NOT NULL,
    status payment_status DEFAULT 'Pending',
    method VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payments IS 'One row per order, representing the financial transaction. Always linked to exactly one order.';

COMMENT ON COLUMN payments.order_id IS 'The order this payment is for. UNIQUE constraint ensures one payment per order. On DELETE CASCADE so payments are removed with their order.';

COMMENT ON COLUMN payments.amount IS 'Total payment amount in INR, with 2 decimal places. Calculated as base_fare + per_km_rate × haversine_distance_km.';

COMMENT ON COLUMN payments.currency IS '3-letter ISO currency code. Defaults to INR (Indian Rupee).';

COMMENT ON COLUMN payments.status IS 'Current status of the payment: Pending, Captured, Failed, or Refunded.';

COMMENT ON COLUMN payments.method IS 'Payment method used. Must be one of UPI, Card, NetBanking, or Wallet.';

COMMENT ON COLUMN payments.created_at IS 'Timestamp when the payment was created.';

-- Constraint: amount must be non-negative
ALTER TABLE payments ADD CONSTRAINT chk_payments_amount_nonnegative CHECK (amount >= 0);

-- Constraint: method must be one of the allowed payment methods
ALTER TABLE payments ADD CONSTRAINT chk_payments_method CHECK (method IN ('UPI', 'Card', 'NetBanking', 'Wallet'));

-- =============================================================================
-- TABLE: invoices
-- =============================================================================

CREATE TABLE invoices (
    invoice_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER UNIQUE NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    total NUMERIC(10,2) NOT NULL,
    tax NUMERIC(10,2) NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invoices IS 'One row per captured/refunded payment. total is the payment amount; tax is GST-inclusive tax calculated at the configured rate.';

COMMENT ON COLUMN invoices.order_id IS 'The order this invoice is for. UNIQUE constraint ensures one invoice per order. On DELETE CASCADE.';

COMMENT ON COLUMN invoices.customer_id IS 'The customer who receives this invoice.';

COMMENT ON COLUMN invoices.total IS 'Total invoice amount in INR. Equals the payment amount.';

COMMENT ON COLUMN invoices.tax IS 'GST-inclusive tax amount. Calculated as total × tax_rate_pct / (100 + tax_rate_pct), rounded to 2 decimals.';

COMMENT ON COLUMN invoices.issued_at IS 'Timestamp when the invoice was issued. Set to the payment created_at.';

-- Constraint: total and tax must be non-negative, tax <= total
ALTER TABLE invoices ADD CONSTRAINT chk_invoices_total_nonnegative CHECK (total >= 0);
ALTER TABLE invoices ADD CONSTRAINT chk_invoices_tax_nonnegative CHECK (tax >= 0);
ALTER TABLE invoices ADD CONSTRAINT chk_invoices_tax_not_exceed_total CHECK (tax <= total);

-- =============================================================================
-- TABLE: maintenance_log
-- =============================================================================

CREATE TABLE maintenance_log (
    log_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    drone_id INTEGER NOT NULL REFERENCES drones(drone_id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    battery_pct_at_trigger INTEGER NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

COMMENT ON TABLE maintenance_log IS 'Historical and open maintenance events for drones. Each row records a battery-level trigger event.';

COMMENT ON COLUMN maintenance_log.drone_id IS 'The drone that triggered maintenance. On DELETE CASCADE removes logs with the drone.';

COMMENT ON COLUMN maintenance_log.reason IS 'Human-readable reason for the maintenance event.';

COMMENT ON COLUMN maintenance_log.battery_pct_at_trigger IS 'Battery level percentage at the moment the maintenance trigger fired.';

COMMENT ON COLUMN maintenance_log.triggered_at IS 'Timestamp when the maintenance trigger was fired.';

COMMENT ON COLUMN maintenance_log.resolved_at IS 'Timestamp when the maintenance was resolved. NULL if still open.';

-- Constraint: resolved_at must be >= triggered_at if set
ALTER TABLE maintenance_log ADD CONSTRAINT chk_maintenance_resolved_after_triggered CHECK (
    resolved_at IS NULL OR resolved_at >= triggered_at
);

-- Index on (drone_id, triggered_at DESC) for maintenance history queries
CREATE INDEX idx_maintenance_drone_triggered ON maintenance_log(drone_id, triggered_at DESC);

-- =============================================================================
-- TABLE: system_config
-- =============================================================================

DROP TABLE IF EXISTS system_config CASCADE;

CREATE TABLE system_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value VARCHAR(50) NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE system_config IS 'Tunable configuration settings for the drone grid. Keys control thresholds, rates, and pricing. Updated_at tracks when each key was last modified.';

COMMENT ON COLUMN system_config.config_key IS 'The configuration key name. Primary key.';

COMMENT ON COLUMN system_config.config_value IS 'The configuration value string.';

COMMENT ON COLUMN system_config.description IS 'Human-readable description of what this key controls.';

COMMENT ON COLUMN system_config.updated_at IS 'Timestamp when this key was last updated.';

-- Constraint: config_value length check (practical limit)
ALTER TABLE system_config ADD CONSTRAINT chk_config_key_length CHECK (char_length(config_key) <= 50);
ALTER TABLE system_config ADD CONSTRAINT chk_config_value_length CHECK (char_length(config_value) <= 50);

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================

-- Grant permissions for broader access (useful in Docker)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- =============================================================================
-- TABLE: audit_log
-- =============================================================================

CREATE TABLE audit_log (
    log_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor VARCHAR(80) NOT NULL,
    action VARCHAR(60) NOT NULL,
    resource VARCHAR(60),
    status SMALLINT,
    detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Append-only audit trail for security-relevant actions: authentication, authorization, role changes, etc.';

COMMENT ON COLUMN audit_log.actor IS 'User ID or system identifier performing the action.';

COMMENT ON COLUMN audit_log.action IS 'Name of the action (e.g. login_failed, order_created).';

COMMENT ON COLUMN audit_log.resource IS 'Logical resource affected (order_id, drone_id, email, etc.), often empty for system actions.';

COMMENT ON COLUMN audit_log.status IS 'HTTP-equivalent status code: 200 = ok, 401 = unauthorized, 403 = forbidden, 429 = rate limited, etc.';

COMMENT ON COLUMN audit_log.detail IS 'Free-form detail string — sanitized reason or additional context.';

-- Index for recent-audit queries (default admin dashboard view)
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor);
CREATE INDEX idx_audit_log_action ON audit_log(action);

