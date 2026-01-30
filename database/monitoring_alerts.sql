-- =========================================
-- MONITORING: Shift Close Stock Anomaly Alert
-- =========================================
-- Detects shifts closed with net negative stock
-- (indicates theft, data corruption, or bugs)
-- =========================================

CREATE OR REPLACE FUNCTION check_shift_stock_anomalies()
RETURNS TRIGGER AS $$
DECLARE
    anomaly_count INTEGER;
    anomaly_details TEXT;
BEGIN
    -- Only check when shift is being closed
    IF NEW.status = 'closed' AND OLD.status = 'open' THEN
        
        -- Find medicines with net negative stock during this shift
        SELECT COUNT(*), STRING_AGG(
            m.name || ' (net: ' || ms.net_change || ')', 
            ', '
        )
        INTO anomaly_count, anomaly_details
        FROM medicine_stock_by_shift ms
        JOIN medicines m ON m.id = ms.medicine_id
        WHERE ms.shift_id = NEW.id
        AND ms.net_change < 0
        GROUP BY ms.shift_id;
        
        -- Log warning if anomalies found
        IF anomaly_count > 0 THEN
            RAISE WARNING '🚨 SHIFT STOCK ANOMALY DETECTED: Shift % closed with % items showing net negative stock: %',
                NEW.id, anomaly_count, anomaly_details
                USING HINT = 'Review inventory adjustments for this shift. Possible theft or data corruption.';
                
            -- TODO: Send alert to monitoring system
            -- PERFORM pg_notify('shift_anomaly', json_build_object(
            --     'shift_id', NEW.id,
            --     'anomaly_count', anomaly_count,
            --     'details', anomaly_details
            -- )::text);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on shift status changes
DROP TRIGGER IF EXISTS trg_check_shift_anomalies ON shifts;
CREATE TRIGGER trg_check_shift_anomalies
AFTER UPDATE ON shifts
FOR EACH ROW
EXECUTE FUNCTION check_shift_stock_anomalies();

COMMENT ON FUNCTION check_shift_stock_anomalies() IS 
'Monitors shift closures for stock anomalies (net negative). Alerts on potential theft or data corruption.';
