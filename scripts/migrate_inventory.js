import db from '../src/config/dataBase.js';

const runMigrationStepByStep = async () => {
    const client = await db.connect();

    try {
        console.log('🚀 Starting step-by-step migration...\n');

        await client.query('BEGIN');
        console.log('✅  Transaction started\n');

        // STEP 1
        console.log('STEP 1: Creating index...');
        try {
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_medicine 
                ON inventory_adjustments(medicine_id)
            `);
            console.log('✅ Index created\n');
        } catch (err) {
            console.error('❌ Index creation failed:', err.message);
            throw err;
        }

        // STEP 2
        console.log('STEP 2: Creating VIEW...');
        try {
            await client.query(`
                CREATE OR REPLACE VIEW medicine_stock AS
                SELECT 
                    m.id,
                    m.name,
                    COALESCE(SUM(ia.quantity_change), 0) as current_stock,
                    m.low_stock_threshold,
                    (COALESCE(SUM(ia.quantity_change), 0) <= COALESCE(m.low_stock_threshold, 10)) as is_low_stock
                FROM medicines m
                LEFT JOIN inventory_adjustments ia ON ia.medicine_id = m.id
                GROUP BY m.id, m.name, m.low_stock_threshold
            `);
            console.log('✅ VIEW created\n');
        } catch (err) {
            console.error('❌ VIEW creation failed:', err.message);
            throw err;
        }

        // STEP 3
        console.log('STEP 3: Finding user for backfill...');
        try {
            const performingUser = await client.query(`
                SELECT u.id, u.full_name
                FROM users u
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN roles r ON r.id = ur.role_id
                WHERE r.name IN ('admin', 'doctor')
                LIMIT 1
            `);

            if (performingUser.rows.length === 0) {
                console.warn('⚠️ No admin or doctor user found for backfill. Skipping backfill.');
            } else {
                console.log(`✅ Using user: ${performingUser.rows[0].full_name} (ID: ${performingUser.rows[0].id})`);

                // STEP 4
                console.log('\nSTEP 4: Backfilling adjustments...');
                const backfillResult = await client.query(`
                    INSERT INTO inventory_adjustments 
                        (medicine_id, adjustment_type, quantity_change, performed_by, reason, created_at)
                    SELECT 
                        m.id,
                        'migration_initial_stock',
                        m.quantity,
                        $1,
                        'Initial stock from medicines.quantity during migration',
                        NOW()
                    FROM medicines m
                    WHERE m.quantity > 0 
                    AND NOT EXISTS (
                        SELECT 1 FROM inventory_adjustments WHERE medicine_id = m.id
                    )
                `, [performingUser.rows[0].id]);

                console.log(`✅ Backfilled ${backfillResult.rowCount} medicines\n`);
            }
        } catch (err) {
            console.error('❌ Backfill failed:', err.message);
            throw err;
        }

        // STEP 5
        console.log('STEP 5: Renaming column...');
        try {
            await client.query(`
                ALTER TABLE medicines RENAME COLUMN quantity TO quantity_deprecated
                    `);
            console.log('✅ Column renamed\n');
        } catch (err) {
            console.error('❌ Column rename failed:', err.message);
            throw err;
        }

        await client.query('COMMIT');
        console.log('\n🎉 MIGRATION SUCCESSFUL!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ MIGRATION FAILED:', error.message);
        console.error('🔙 Rolled back');
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
};

runMigrationStepByStep();
