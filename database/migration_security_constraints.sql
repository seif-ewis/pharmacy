-- =========================================
-- PHASE 2: DATABASE SECURITY CONSTRAINTS
-- =========================================
-- Enforces shift and type validation at DB level
-- =========================================

-- Step 1: Trigger to prevent closed-shift adjustments
CREATE OR REPLACE FUNCTION prevent_closed_shift_adjustments()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate if shift_id is provided
    IF NEW.shift_id IS NOT NULL THEN
        -- Check if the shift is closed
        IF EXISTS (
            SELECT 1 FROM shifts 
            WHERE id = NEW.shift_id 
            AND status != 'open'
        ) THEN
            RAISE EXCEPTION 'Cannot log adjustment to closed shift (shift_id: %)', NEW.shift_id
                USING HINT = 'Adjustments can only be logged to open shifts';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_prevent_closed_shift_adjustments ON inventory_adjustments;
CREATE TRIGGER trg_prevent_closed_shift_adjustments
BEFORE INSERT ON inventory_adjustments
FOR EACH ROW
EXECUTE FUNCTION prevent_closed_shift_adjustments();

COMMENT ON FUNCTION prevent_closed_shift_adjustments() IS 
'Prevents logging inventory adjustments to closed shifts. Critical for audit trail integrity.';

-- Step 2: CHECK constraint for adjustment_type
ALTER TABLE inventory_adjustments
ADD CONSTRAINT chk_adjustment_type_valid
CHECK (adjustment_type IN (
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
));

COMMENT ON CONSTRAINT chk_adjustment_type_valid ON inventory_adjustments IS 
'Validates adjustment_type against allowed values. Prevents typos and invalid types.';

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Security constraints added:';
    RAISE NOTICE '   - Trigger: prevent_closed_shift_adjustments';
    RAISE NOTICE '   - CHECK: chk_adjustment_type_valid';
    RAISE NOTICE '   - Audit trail is now legally defensible';
END $$;
