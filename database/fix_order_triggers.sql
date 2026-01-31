-- Migration: Consolidation of Order Immutability Triggers
-- Purpose: Remove redundant/over-restrictive triggers that block return status updates
-- This replaces the old 'prevent_completed_order_update' with 'fn_enforce_order_immutability'

BEGIN;

-- 1. Drop the old restrictive function and its triggers
DROP FUNCTION IF EXISTS prevent_completed_order_update CASCADE;

-- 2. Drop the redundant name 'enforce_order_immutability' just in case it points elsewhere
DROP TRIGGER IF EXISTS enforce_order_immutability ON orders;
DROP TRIGGER IF EXISTS prevent_order_update ON orders;

-- 3. Ensure the refined immutability logic is in place
CREATE OR REPLACE FUNCTION fn_enforce_order_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Only protect specific attribution columns from CHANGING once they are set
    
    -- Protect Completed Attribution (Sale verification)
    IF OLD.completed_shift_id IS NOT NULL AND NEW.completed_shift_id IS DISTINCT FROM OLD.completed_shift_id THEN
        RAISE EXCEPTION 'completed_shift_id is immutable once set.';
    END IF;
    IF OLD.completed_at IS NOT NULL AND NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
        RAISE EXCEPTION 'completed_at is immutable once set.';
    END IF;

    -- Protect Returned Attribution (Return verification)
    -- Allow setting it the first time, but prevent changing it thereafter
    IF OLD.returned_shift_id IS NOT NULL AND NEW.returned_shift_id IS DISTINCT FROM OLD.returned_shift_id THEN
        RAISE EXCEPTION 'returned_shift_id is immutable once set.';
    END IF;
    IF OLD.returned_at IS NOT NULL AND NEW.returned_at IS DISTINCT FROM OLD.returned_at THEN
        RAISE EXCEPTION 'returned_at is immutable once set.';
    END IF;

    -- Protect Status Alignment
    -- Once an order is completed/delivered, it can move to 'returned' but NOT back to 'pending' etc.
    IF OLD.status IN ('completed', 'delivered') AND NEW.status NOT IN ('completed', 'delivered', 'returned') THEN
         RAISE EXCEPTION 'Completed/Delivered orders can only move to Returned state. Current: %, New: %', OLD.status, NEW.status;
    END IF;

    -- Note: This trigger NO LONGER blocks updates to return_status, promotion_id, etc. 
    -- unless they are explicitly checked above.

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Re-attach the refined trigger
DROP TRIGGER IF EXISTS trg_orders_immutability ON orders;
CREATE TRIGGER trg_orders_immutability
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_order_immutability();

COMMIT;
