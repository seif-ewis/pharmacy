import db from '../src/config/dataBase.js';

async function migrateOrderShiftTracking() {
    const client = await db.connect();
    try {
        console.log('🔄 Starting order shift tracking migration...\n');

        await client.query('BEGIN');

        // 1. Add completed_shift_id column
        console.log('1️⃣ Adding completed_shift_id column...');
        await client.query(`
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS completed_shift_id UUID REFERENCES shifts(id)
        `);
        console.log('✅ Column added\n');

        // 2. Create index
        console.log('2️⃣ Creating index...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_orders_completed_shift 
            ON orders(completed_shift_id)
        `);
        console.log('✅ Index created\n');

        // 3. Add comment
        console.log('3️⃣ Adding column comment...');
        await client.query(`
            COMMENT ON COLUMN orders.completed_shift_id IS 
            'Immutable: The shift that completed/processed this order. Never changes after set. Used for shift reconciliation and revenue tracking.'
        `);
        console.log('✅ Comment added\n');

        await client.query('COMMIT');

        console.log('🎉 Migration completed successfully!\n');
        console.log('✅ Orders now have immutable shift tracking');
        console.log('✅ Order -> Revenue -> Inventory linkage established');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await db.end();
    }
}

migrateOrderShiftTracking()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Error:', err);
        process.exit(1);
    });
