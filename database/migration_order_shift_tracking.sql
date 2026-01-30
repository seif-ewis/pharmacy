-- Migration: Add completed_shift_id to orders
-- Purpose: Immutable linkage between order -> revenue -> inventory
-- This tracks which shift COMPLETED the order (processed the sale)

BEGIN;

-- Add column (allow NULL for existing orders)
ALTER TABLE orders
ADD COLUMN completed_shift_id UUID REFERENCES shifts(id);

-- Add index for queries
CREATE INDEX idx_orders_completed_shift ON orders(completed_shift_id);

-- Add comment
COMMENT ON COLUMN orders.completed_shift_id IS 
'Immutable: The shift that completed/processed this order. Never changes after set. Used for shift reconciliation and revenue tracking.';

COMMIT;
