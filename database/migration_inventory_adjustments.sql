-- ===============================================
-- INVENTORY ADJUSTMENT SYSTEM - MIGRATION SCRIPT
-- ===============================================
-- This script migrates from direct medicines.quantity updates
-- to a proper adjustment-based audit trail system.
--
-- Run this script in a transaction for safety:
-- BEGIN;
-- \i migration_inventory_adjustments.sql
-- COMMIT; (or ROLLBACK if errors)
-- ===============================================

-- Step 1: Create INDEX for performance
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_medicine 
ON inventory_adjustments(medicine_id);

-- Step 2: Create VIEW to compute stock from adjustments
CREATE OR REPLACE VIEW medicine_stock AS
SELECT 
    m.id,
    m.name,
    COALESCE(SUM(ia.quantity_change), 0) as current_stock,
    m.low_stock_threshold,
    (COALESCE(SUM(ia.quantity_change), 0) <= COALESCE(m.low_stock_threshold, 10)) as is_low_stock
FROM medicines m
LEFT JOIN inventory_adjustments ia ON ia.medicine_id = m.id
GROUP BY m.id, m.name, m.low_stock_threshold;

-- Step 3: Backfill existing quantities as initial adjustments
-- Only for medicines that have quantity > 0 and no adjustments yet
INSERT INTO inventory_adjustments 
    (medicine_id, adjustment_type, quantity_change, performed_by, reason, created_at)
SELECT 
    m.id,
    'migration_initial_stock',
    m.quantity,
    (SELECT id FROM users WHERE role = 'admin' OR 'doctor' = ANY(
        SELECT r.name FROM user_roles ur 
        JOIN roles r ON r.id = ur.role_id 
        WHERE ur.user_id = users.id
    ) LIMIT 1),
    'Initial stock from medicines.quantity during migration to adjustment system',
    NOW()
FROM medicines m
WHERE m.quantity > 0 
AND NOT EXISTS (
    SELECT 1 FROM inventory_adjustments WHERE medicine_id = m.id
);

-- Step 4: Verify migration (optional check)
-- Compare old quantity with new computed stock
DO $$
DECLARE
    mismatch_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mismatch_count
    FROM medicines m
    JOIN medicine_stock ms ON ms.id = m.id
    WHERE m.quantity != ms.current_stock;
    
    IF mismatch_count > 0 THEN
        RAISE WARNING 'Found % medicines with stock mismatch. Review before proceeding.', mismatch_count;
    ELSE
        RAISE NOTICE 'Migration verification passed: All stocks match.';
    END IF;
END $$;

-- Step 5: Rename quantity column (keep as backup, don't delete)
ALTER TABLE medicines RENAME COLUMN quantity TO quantity_deprecated;

-- Step 6: Add column comment for clarity
COMMENT ON COLUMN medicines.quantity_deprecated IS 
'DEPRECATED: Stock is now computed from inventory_adjustments. This column preserved for rollback safety.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete! Stock is now computed from inventory_adjustments.';
    RAISE NOTICE 'VIEW medicine_stock created for stock queries.';
    RAISE NOTICE 'Column medicines.quantity renamed to quantity_deprecated.';
END $$;
