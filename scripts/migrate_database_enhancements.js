import db from "../src/config/dataBase.js";

/**
 * Database Migration: Shifts Table Redesign + Order Status Audit Logging
 * 
 * This migration:
 * 1. Creates order_status_logs table for audit compliance
 * 2. Recreates shifts table with financial tracking
 * 3. Adds shift_id foreign keys to orders, returns, payments
 * 4. Migrates existing shift data to new schema
 */

async function migrate() {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        console.log('🚀 Starting database migration...\n');

        // ============================================================
        // STEP 1: Create order_status_logs table
        // ============================================================
        console.log('📋 Step 1: Creating order_status_logs table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS order_status_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                old_status VARCHAR(50),
                new_status VARCHAR(50) NOT NULL,
                changed_by UUID NOT NULL REFERENCES users(id),
                changed_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_order_status_logs_order 
            ON order_status_logs(order_id);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_order_status_logs_date 
            ON order_status_logs(changed_at DESC);
        `);

        console.log('✅ order_status_logs table created\n');

        // ============================================================
        // STEP 2: Backup existing shifts data
        // ============================================================
        console.log('📦 Step 2: Backing up existing shifts data...');

        const existingShifts = await client.query(`
            SELECT * FROM shifts ORDER BY start_at
        `);

        console.log(`   Found ${existingShifts.rows.length} existing shifts to migrate\n`);

        // ============================================================
        // STEP 3: Drop old shifts table and recreate with new schema
        // ============================================================
        console.log('🔄 Step 3: Recreating shifts table with new schema...');

        await client.query('DROP TABLE IF EXISTS shifts CASCADE');

        await client.query(`
            CREATE TABLE shifts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                opened_by UUID NOT NULL REFERENCES users(id),
                closed_by UUID REFERENCES users(id),
                opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
                closed_at TIMESTAMP,
                total_orders INTEGER DEFAULT 0,
                total_prescriptions INTEGER DEFAULT 0,
                total_returns INTEGER DEFAULT 0,
                gross_revenue NUMERIC(10,2) DEFAULT 0.00,
                net_revenue NUMERIC(10,2) DEFAULT 0.00,
                status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed'))
            );
        `);

        await client.query(`
            CREATE INDEX idx_shifts_status ON shifts(status);
        `);

        await client.query(`
            CREATE INDEX idx_shifts_opened_by ON shifts(opened_by);
        `);

        await client.query(`
            CREATE INDEX idx_shifts_dates ON shifts(opened_at, closed_at);
        `);

        console.log('✅ New shifts table created\n');

        // ============================================================
        // STEP 4: Migrate old shift data to new schema
        // ============================================================
        console.log('📊 Step 4: Migrating historical shift data...');

        for (const oldShift of existingShifts.rows) {
            const status = oldShift.is_active ? 'open' : 'closed';

            await client.query(`
                INSERT INTO shifts (
                    id, opened_by, closed_by, opened_at, closed_at, 
                    total_orders, total_prescriptions, gross_revenue, net_revenue, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                oldShift.id,
                oldShift.doctor_id, // opened_by
                oldShift.is_active ? null : oldShift.doctor_id, // closed_by
                oldShift.start_at, // opened_at
                oldShift.end_at, // closed_at
                oldShift.orders_count || 0,
                oldShift.prescriptions_count || 0,
                oldShift.total_revenue || 0.00,
                oldShift.total_revenue || 0.00, // net_revenue same as gross for old data
                status
            ]);
        }

        console.log(`✅ Migrated ${existingShifts.rows.length} shifts\n`);

        // ============================================================
        // STEP 5: Add shift_id column to orders table
        // ============================================================
        console.log('🔗 Step 5: Adding shift_id to orders table...');

        await client.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id);
        `);

        console.log('✅ shift_id added to orders\n');

        // ============================================================
        // STEP 6: Add shift_id column to returns table
        // ============================================================
        console.log('🔗 Step 6: Adding shift_id to returns table...');

        await client.query(`
            ALTER TABLE returns 
            ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_returns_shift ON returns(shift_id);
        `);

        console.log('✅ shift_id added to returns\n');

        // ============================================================
        // STEP 7: Add shift_id column to payments table
        // ============================================================
        console.log('🔗 Step 7: Adding shift_id to payments table...');

        await client.query(`
            ALTER TABLE payments 
            ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_payments_shift ON payments(shift_id);
        `);

        console.log('✅ shift_id added to payments\n');

        // ============================================================
        // STEP 8: Backfill order status logs for existing orders
        // ============================================================
        console.log('📝 Step 8: Creating initial status logs for existing orders...');

        const orders = await client.query(`
            SELECT id, status, user_id, created_at 
            FROM orders 
            ORDER BY created_at
        `);

        for (const order of orders.rows) {
            await client.query(`
                INSERT INTO order_status_logs (order_id, old_status, new_status, changed_by, changed_at)
                VALUES ($1, NULL, $2, $3, $4)
            `, [order.id, order.status, order.user_id, order.created_at]);
        }

        console.log(`✅ Created status logs for ${orders.rows.length} existing orders\n`);

        // ============================================================
        // COMMIT
        // ============================================================
        await client.query('COMMIT');

        console.log('\n🎉 Migration completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Shifts migrated: ${existingShifts.rows.length}`);
        console.log(`   - Order status logs created: ${orders.rows.length}`);
        console.log('   - New tables: order_status_logs');
        console.log('   - Modified tables: shifts, orders, returns, payments');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrate()
        .then(() => {
            console.log('\n✅ Migration script completed');
            process.exit(0);
        })
        .catch((err) => {
            console.error('\n❌ Migration script failed:', err);
            process.exit(1);
        });
}

export default migrate;
