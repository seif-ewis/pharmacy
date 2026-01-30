-- ========================================
-- PHASE 1 & 2: SHIFT TRACKING + CONSTRAINTS
-- ========================================
-- Fixes critical architectural issues:
-- 1. Shift-awareness for proper reconciliation
-- 2. Database-level protection via constraints
-- ========================================

-- PHASE 1: Add Shift Tracking
-- ========================================

-- Step 1: Add shift_id column (nullable for backward compatibility)
ALTER TABLE inventory_adjustments 
ADD COLUMN shift_id UUID REFERENCES shifts(id);

-- Step 2: Add index for performance
CREATE INDEX idx_inventory_adjustments_shift 
ON inventory_adjustments(shift_id);

-- Step 3: Add helpful comment
COMMENT ON COLUMN inventory_adjustments.shift_id IS 
'Shift during which this adjustment occurred. NULL for non-shift adjustments (migrations, manual corrections outside shift).';

-- Step 4: Create shift-aware stock VIEW
CREATE OR REPLACE VIEW medicine_stock_by_shift AS
SELECT 
    ia.shift_id,
    s.opened_at,
    s.closed_at,
    s.opened_by,
    ia.medicine_id,
    m.name as medicine_name,
    SUM(CASE WHEN ia.adjustment_type = 'sale' THEN ia.quantity_change ELSE 0 END) as sales_quantity,
    SUM(CASE WHEN ia.adjustment_type = 'return_restock' THEN ia.quantity_change ELSE 0 END) as returns_quantity,
    SUM(CASE WHEN ia.adjustment_type IN ('restock', 'initial_stock') THEN ia.quantity_change ELSE 0 END) as restocked_quantity,
    SUM(ia.quantity_change) as net_change
FROM inventory_adjustments ia
JOIN medicines m ON m.id = ia.medicine_id
LEFT JOIN shifts s ON s.id = ia.shift_id
WHERE ia.shift_id IS NOT NULL
GROUP BY ia.shift_id, s.opened_at, s.closed_at, s.opened_by, ia.medicine_id, m.name;

COMMENT ON VIEW medicine_stock_by_shift IS 
'Per-shift inventory changes broken down by type (sales, returns, restocks). Critical for shift reconciliation.';

-- PHASE 2: Database Protection
-- ========================================

-- Step 5: Create adjustment type ENUM
CREATE TYPE adjustment_type_enum AS ENUM (
    'initial_stock',
    'migration_initial_stock',
    'sale',
    'return_restock',
    'return_discard',
    'manual_adjustment',
    'restock',
    'damage',
    'expired',
    'correction'
);

-- Step 6: Convert existing column to ENUM
ALTER TABLE inventory_adjustments 
ALTER COLUMN adjustment_type TYPE adjustment_type_enum 
USING adjustment_type::adjustment_type_enum;

-- Step 7: Add NOT NULL constraints
ALTER TABLE inventory_adjustments
ALTER COLUMN performed_by SET NOT NULL,
ALTER COLUMN adjustment_type SET NOT NULL,
ALTER COLUMN quantity_change SET NOT NULL;

-- Step 8: Add CHECK constraint (no zero adjustments)
ALTER TABLE inventory_adjustments
ADD CONSTRAINT chk_quantity_change_nonzero 
CHECK (quantity_change <> 0);

-- Step 9: Add constraint comment
COMMENT ON CONSTRAINT chk_quantity_change_nonzero ON inventory_adjustments IS 
'Prevents logging adjustments with zero quantity change - all adjustments must have meaningful impact.';

-- Verification
-- ========================================

DO $$
DECLARE
    adjustment_count INTEGER;
    shift_aware_count INTEGER;
BEGIN
    -- Count total adjustments
    SELECT COUNT(*) INTO adjustment_count FROM inventory_adjustments;
    
    -- Count shift-aware adjustments (should be 0 until we update the service)
    SELECT COUNT(*) INTO shift_aware_count 
    FROM inventory_adjustments WHERE shift_id IS NOT NULL;
    
    RAISE NOTICE '✅ Migration complete!';
    RAISE NOTICE '   Total adjustments: %', adjustment_count;
    RAISE NOTICE '   Shift-aware: %', shift_aware_count;
    RAISE NOTICE '   Constraints: ENUM, NOT NULL, CHECK added';
    RAISE NOTICE '   New VIEW: medicine_stock_by_shift created';
END $$;
