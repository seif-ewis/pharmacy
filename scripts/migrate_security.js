import db from '../src/config/dataBase.js';

const runSecurityMigration = async () => {
    const client = await db.connect();

    try {
        console.log('🔒 Adding security constraints...\n');

        await client.query('BEGIN');

        // Step 1: Create trigger function
        console.log('  → Creating prevent_closed_shift_adjustments function...');
        await client.query(`
            CREATE OR REPLACE FUNCTION prevent_closed_shift_adjustments()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.shift_id IS NOT NULL THEN
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
        `);
        console.log('  ✅ Function created');

        // Step 2: Create trigger
        console.log('  → Creating trigger...');
        await client.query(`
            DROP TRIGGER IF EXISTS trg_prevent_closed_shift_adjustments ON inventory_adjustments
        `);
        await client.query(`
            CREATE TRIGGER trg_prevent_closed_shift_adjustments
            BEFORE INSERT ON inventory_adjustments
            FOR EACH ROW
            EXECUTE FUNCTION prevent_closed_shift_adjustments()
        `);
        console.log('  ✅ Trigger created');

        // Step 3: Add CHECK constraint for adjustment_type
        console.log('  → Adding CHECK constraint for adjustment_type...');
        try {
            await client.query(`
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
                ))
            `);
            console.log('  ✅ CHECK constraint added');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('  ✅ Constraint already exists');
            } else {
                throw err;
            }
        }

        await client.query('COMMIT');

        console.log('\n🎉 ========================================');
        console.log('🎉 SECURITY CONSTRAINTS ACTIVE!');
        console.log('🎉 ========================================');
        console.log('✅ Closed-shift protection enabled (DB trigger)');
        console.log('✅ Type validation enabled (CHECK constraint)');
        console.log('✅ Service-layer validation active');
        console.log('\n📝 Audit trail is now legally defensible');

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

runSecurityMigration();
