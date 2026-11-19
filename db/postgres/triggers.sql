-- =============================================================================
-- Urban Drone Logistics DBMS — Triggers (Phase 2)
-- =============================================================================
-- Run AFTER schema.sql and seed.sql:
--   psql -v ON_ERROR_STOP=1 -f schema.sql
--   psql -v ON_ERROR_STOP=1 -f seed.sql
--   psql -v ON_ERROR_STOP=1 -f triggers.sql
--
-- Idempotent: all objects are dropped before recreation.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: read the critical battery threshold from system_config (default 15)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION critical_threshold()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        (SELECT config_value::int FROM system_config WHERE config_key = 'battery_critical_threshold'),
        15
    );
$$;

-- ---------------------------------------------------------------------------
-- TRIGGER 1 — Battery low → Maintenance (the "telemetry → trigger" path)
-- ---------------------------------------------------------------------------
-- Rule (documented):
--   * If a NON-airborne drone's battery drops below the critical threshold,
--     its status is forced to 'Maintenance' and an open maintenance_log row
--     is inserted.
--   * Drones already 'In_Flight' are NOT interrupted mid-air at a mild
--     threshold — they continue their flight.  However, the moment such a
--     drone LANDS (status leaves 'In_Flight') while still below threshold,
--     it is forced to 'Maintenance' on landing.  This is the "In_Flight
--     drones go to Maintenance on landing" rule.
--   * No duplicate open log rows are created while the drone stays in
--     Maintenance.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_drones_battery_low()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_threshold INTEGER := critical_threshold();
BEGIN
    -- Only act when the battery is at or below the critical threshold.
    IF NEW.battery_pct <= v_threshold THEN
        IF OLD.status = 'In_Flight' AND NEW.status = OLD.status THEN
            -- Still airborne: do not interrupt.  Let the battery update stand.
            RETURN NEW;
        ELSE
            -- Non-airborne, OR an In_Flight drone that is landing
            -- (status is changing away from In_Flight).
            NEW.status := 'Maintenance'::drone_status;

            -- Insert an open maintenance log only if there is no open row yet.
            IF NOT EXISTS (
                SELECT 1 FROM maintenance_log
                WHERE drone_id = NEW.drone_id AND resolved_at IS NULL
            ) THEN
                INSERT INTO maintenance_log (drone_id, reason, battery_pct_at_trigger, triggered_at)
                VALUES (
                    NEW.drone_id,
                    'Battery below critical threshold (' || v_threshold || '%) — auto-triggered by telemetry',
                    NEW.battery_pct,
                    NOW()
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_drones_battery_low ON drones;
CREATE TRIGGER trg_drones_battery_low
    BEFORE UPDATE OF battery_pct ON drones
    FOR EACH ROW
    EXECUTE FUNCTION trg_drones_battery_low();

-- Also fire when an In_Flight drone lands (status changes) with a low battery,
-- even if the battery_pct column itself was not updated in that statement.
DROP TRIGGER IF EXISTS trg_drones_landing_maintenance ON drones;
CREATE TRIGGER trg_drones_landing_maintenance
    BEFORE UPDATE OF status ON drones
    FOR EACH ROW
    EXECUTE FUNCTION trg_drones_battery_low();

-- ---------------------------------------------------------------------------
-- TRIGGER 2 — Keep last_seen_at current on every telemetry sync
-- ---------------------------------------------------------------------------
-- The ingestion service writes battery_pct (and optionally last_seen_at).
-- This trigger guarantees last_seen_at is never stale: if the caller did not
-- supply a fresher timestamp, it is bumped to NOW().
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_drones_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.last_seen_at IS NULL OR NEW.last_seen_at < OLD.last_seen_at THEN
        NEW.last_seen_at := NOW();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_drones_last_seen ON drones;
CREATE TRIGGER trg_drones_last_seen
    BEFORE UPDATE ON drones
    FOR EACH ROW
    EXECUTE FUNCTION trg_drones_last_seen();

-- ---------------------------------------------------------------------------
-- TRIGGER 3 — Prevent resolved_at going backwards on maintenance_log
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_maintenance_resolved_monotonic()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NOT NULL
       AND NEW.resolved_at < OLD.resolved_at THEN
        RAISE EXCEPTION 'resolved_at cannot go backwards';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintenance_resolved_monotonic ON maintenance_log;
CREATE TRIGGER trg_maintenance_resolved_monotonic
    BEFORE UPDATE OF resolved_at ON maintenance_log
    FOR EACH ROW
    EXECUTE FUNCTION trg_maintenance_resolved_monotonic();

-- =============================================================================
-- END OF TRIGGERS
-- =============================================================================