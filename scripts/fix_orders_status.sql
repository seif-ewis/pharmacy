-- Fix orders status CHECK constraint to include 'processing'
-- Run this in your database client (pgAdmin, psql, or Supabase SQL editor)

-- Step 1: Drop the old constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Step 2: Add new constraint with all valid statuses including 'processing'
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'scheduled', 'processing', 'completed', 'canceled', 'cancelled', 'delivered'));

-- Verify by checking existing statuses
SELECT DISTINCT status FROM orders;
