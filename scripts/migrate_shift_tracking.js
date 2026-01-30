import db from '../src/config/dataBase.js';

const runShiftIdMigration = async () => {
    const client = await db.connect();

    try {
        console.log('🚀 Phase 1: Adding shift tracking (simplified)...\n');

        await client.query('BEGIN');

        // Step 1: Add shift_id column
        console.log('  → Adding shift_id column...');
        try {
            await client.query(`
                ALTER TABLE inventory_adjustments 
                ADD COLUMN shift_id UUID REFERENCES shifts(id)
            `);
            console.log('  ✅ Column added');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('  ✅ Column already exists, skipping');
            } else {
                throw err;
            }
        }

        // Step 2: Add index
        console.log('  → Creating index...');
        try {
            await client.query(`
                CREATE INDEX idx_inventory_adjustments_shift 
                ON inventory_adjustments(shift_id)
            `);
            console.log('  ✅ Index created');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('  ✅ Index already exists, skipping');
            } else {
                throw err;
            }
        }

        // Step 3: Add comment
        await client.query(`
            COMMENT ON COLUMN inventory_adjustments.shift_id IS 
            'Shift during which this adjustment occurred. NULL for non-shift adjustments (migrations, manual corrections).'
        `);

        // Step 4: Create shift-aware VIEW
        console.log('  → Creating medicine_stock_by_shift VIEW...');
        await client.query(`
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
            GROUP BY ia.shift_id, s.opened_at, s.closed_at, s.opened_by, ia.medicine_id, m.name
        `);
        console.log('  ✅ VIEW created');

        await client.query('COMMIT');

        console.log('\n🎉 ========================================');
        console.log('🎉 SHIFT TRACKING ENABLED!');
        console.log('🎉 ========================================');
        console.log('✅ shift_id column added');
        console.log('✅ Index created for performance');
        console.log('✅ medicine_stock_by_shift VIEW created');
        console.log('\n📝 Next steps:');
        console.log('   1. Update inventoryController.logAdjustment() to accept shiftId');
        console.log('   2. Update all callers to pass shift_id');
        console.log('   3. Run Phase 2 migration for ENUM + constraints');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        console.error('🔙 Rolled back');
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
};

runShiftIdMigration();
