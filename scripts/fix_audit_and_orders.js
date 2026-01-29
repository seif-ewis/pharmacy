/**
 * Migration: Fix audit_logs table and orders status constraint
 * 
 * This script:
 * 1. Creates the audit_logs table if it doesn't exist
 * 2. Updates the orders status CHECK constraint to include 'processing'
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
    const client = await pool.connect();

    try {
        console.log('Starting migration...');

        // 1. Create audit_logs table if not exists
        console.log('\n1. Creating audit_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                action_type VARCHAR(100) NOT NULL,
                entity_id UUID,
                entity_type VARCHAR(50),
                performed_by UUID REFERENCES users(id),
                details JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ audit_logs table created/verified');

        // Create index for faster lookups
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);
        `);
        console.log('✅ audit_logs indexes created');

        // 2. Fix orders status CHECK constraint
        console.log('\n2. Updating orders status CHECK constraint...');

        // First, drop the existing constraint if it exists
        try {
            await client.query(`
                ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
            `);
            console.log('   Dropped old constraint (if existed)');
        } catch (e) {
            console.log('   No existing constraint to drop');
        }

        // Add new constraint with all valid statuses including 'processing'
        await client.query(`
            ALTER TABLE orders ADD CONSTRAINT orders_status_check 
            CHECK (status IN ('pending', 'scheduled', 'processing', 'completed', 'canceled', 'cancelled', 'delivered'));
        `);
        console.log('✅ orders status constraint updated');

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(console.error);
