BEGIN;
-- Disable existing triggers to allow backfilling
ALTER TABLE orders DISABLE TRIGGER ALL;

-- Add state timestamps
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP;

-- Add return shift tracking
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS returned_shift_id UUID REFERENCES shifts(id);

-- Add indexes for performance & revenue attribution
CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at);
CREATE INDEX IF NOT EXISTS idx_orders_returned_at ON orders(returned_at);
CREATE INDEX IF NOT EXISTS idx_orders_completed_shift ON orders(completed_shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_returned_shift ON orders(returned_shift_id);

-- 1. Data Integrity Trigger Function
CREATE OR REPLACE FUNCTION fn_enforce_order_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Protect Completed Attribution
    IF OLD.completed_shift_id IS NOT NULL AND NEW.completed_shift_id IS DISTINCT FROM OLD.completed_shift_id THEN
        RAISE EXCEPTION 'completed_shift_id is immutable once set.';
    END IF;
    IF OLD.completed_at IS NOT NULL AND NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
        RAISE EXCEPTION 'completed_at is immutable once set.';
    END IF;

    -- Protect Returned Attribution
    IF OLD.returned_shift_id IS NOT NULL AND NEW.returned_shift_id IS DISTINCT FROM OLD.returned_shift_id THEN
        RAISE EXCEPTION 'returned_shift_id is immutable once set.';
    END IF;
    IF OLD.returned_at IS NOT NULL AND NEW.returned_at IS DISTINCT FROM OLD.returned_at THEN
        RAISE EXCEPTION 'returned_at is immutable once set.';
    END IF;

    -- Protect Status Alignment (Basic check)
    IF NEW.status = 'returned' AND NEW.returned_at IS NULL THEN
        RAISE EXCEPTION 'status cannot be "returned" without returned_at timestamp.';
    END IF;
    
    IF (NEW.status = 'completed' OR NEW.status = 'delivered') AND NEW.completed_at IS NULL THEN
        RAISE EXCEPTION 'status cannot be "completed/delivered" without completed_at timestamp.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach Trigger
DROP TRIGGER IF EXISTS trg_orders_immutability ON orders;
CREATE TRIGGER trg_orders_immutability
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_order_immutability();

-- Backfill existing data
UPDATE orders 
SET completed_at = created_at 
WHERE status IN ('completed', 'delivered') AND completed_at IS NULL;

UPDATE orders 
SET canceled_at = created_at 
WHERE status = 'cancelled' AND canceled_at IS NULL;

UPDATE orders 
SET returned_at = created_at 
WHERE status = 'returned' AND returned_at IS NULL;

-- Re-enable triggers
ALTER TABLE orders ENABLE TRIGGER ALL;

COMMIT;
