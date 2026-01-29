import db from '../src/config/dataBase.js';

console.log('🔒 Implementing hard immutability rules at database level...\n');

try {
    // ============================================================
    // TRIGGER 1: Prevent updates to completed orders
    // ============================================================
    console.log('Step 1: Creating trigger to prevent order updates after completion...');

    await db.query(`
        CREATE OR REPLACE FUNCTION prevent_completed_order_update()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Allow transitioning to 'returned' status
            IF NEW.status = 'returned' THEN
                RETURN NEW;
            END IF;

            IF OLD.status = 'completed' OR OLD.status = 'delivered' THEN
                RAISE EXCEPTION 'Cannot modify order after completion. Order ID: %, Status: %', 
                    OLD.id, OLD.status
                USING ERRCODE = '23505';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);

    await db.query(`
        DROP TRIGGER IF EXISTS trigger_prevent_completed_order_update ON orders;
    `);

    await db.query(`
        CREATE TRIGGER trigger_prevent_completed_order_update
        BEFORE UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION prevent_completed_order_update();
    `);

    console.log('✅ Order update protection trigger created\n');

    // ============================================================
    // TRIGGER 2: Prevent deletion of completed orders
    // ============================================================
    console.log('Step 2: Creating trigger to prevent order deletion after completion...');

    await db.query(`
        CREATE OR REPLACE FUNCTION prevent_completed_order_delete()
        RETURNS TRIGGER AS $$
        BEGIN
            IF OLD.status = 'completed' OR OLD.status = 'delivered' THEN
                RAISE EXCEPTION 'Cannot delete completed order. Order ID: %, Status: %', 
                    OLD.id, OLD.status
                USING ERRCODE = '23505';
            END IF;
            RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
    `);

    await db.query(`
        DROP TRIGGER IF EXISTS trigger_prevent_completed_order_delete ON orders;
    `);

    await db.query(`
        CREATE TRIGGER trigger_prevent_completed_order_delete
        BEFORE DELETE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION prevent_completed_order_delete();
    `);

    console.log('✅ Order deletion protection trigger created\n');

    // ============================================================
    // TRIGGER 3: Prevent updates to order_items of completed orders
    // ============================================================
    console.log('Step 3: Creating trigger to prevent order_items updates...');

    await db.query(`
        CREATE OR REPLACE FUNCTION prevent_completed_order_items_update()
        RETURNS TRIGGER AS $$
        DECLARE
            order_status VARCHAR;
        BEGIN
            -- Get the status of the parent order
            SELECT status INTO order_status
            FROM orders
            WHERE id = OLD.order_id;
            
            IF order_status = 'completed' OR order_status = 'delivered' THEN
                RAISE EXCEPTION 'Cannot modify order items after order completion. Order ID: %, Status: %', 
                    OLD.order_id, order_status
                USING ERRCODE = '23505';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);

    await db.query(`
        DROP TRIGGER IF EXISTS trigger_prevent_completed_order_items_update ON order_items;
    `);

    await db.query(`
        CREATE TRIGGER trigger_prevent_completed_order_items_update
        BEFORE UPDATE ON order_items
        FOR EACH ROW
        EXECUTE FUNCTION prevent_completed_order_items_update();
    `);

    console.log('✅ Order items update protection trigger created\n');

    // ============================================================
    // TRIGGER 4: Prevent deletion of order_items of completed orders
    // ============================================================
    console.log('Step 4: Creating trigger to prevent order_items deletion...');

    await db.query(`
        CREATE OR REPLACE FUNCTION prevent_completed_order_items_delete()
        RETURNS TRIGGER AS $$
        DECLARE
            order_status VARCHAR;
        BEGIN
            -- Get the status of the parent order
            SELECT status INTO order_status
            FROM orders
            WHERE id = OLD.order_id;
            
            IF order_status = 'completed' OR order_status = 'delivered' THEN
                RAISE EXCEPTION 'Cannot delete order items after order completion. Order ID: %, Status: %', 
                    OLD.order_id, order_status
                USING ERRCODE = '23505';
            END IF;
            RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
    `);

    await db.query(`
        DROP TRIGGER IF EXISTS trigger_prevent_completed_order_items_delete ON order_items;
    `);

    await db.query(`
        CREATE TRIGGER trigger_prevent_completed_order_items_delete
        BEFORE DELETE ON order_items
        FOR EACH ROW
        EXECUTE FUNCTION prevent_completed_order_items_delete();
    `);

    console.log('✅ Order items deletion protection trigger created\n');

    // ============================================================
    // TRIGGER 5: Prevent updates to payments of completed orders
    // ============================================================
    console.log('Step 5: Creating trigger to prevent payments updates...');

    await db.query(`
        CREATE OR REPLACE FUNCTION prevent_completed_payments_update()
        RETURNS TRIGGER AS $$
        DECLARE
            order_status VARCHAR;
        BEGIN
            -- Get the status of the parent order
            SELECT status INTO order_status
            FROM orders
            WHERE id = OLD.order_id;
            
            IF order_status = 'completed' OR order_status = 'delivered' THEN
                RAISE EXCEPTION 'Cannot modify payment after order completion. Order ID: %, Status: %', 
                    OLD.order_id, order_status
                USING ERRCODE = '23505';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);

    await db.query(`
        DROP TRIGGER IF EXISTS trigger_prevent_completed_payments_update ON payments;
    `);

    await db.query(`
        CREATE TRIGGER trigger_prevent_completed_payments_update
        BEFORE UPDATE ON payments
        FOR EACH ROW
        EXECUTE FUNCTION prevent_completed_payments_update();
    `);

    console.log('✅ Payments update protection trigger created\n');

    // ============================================================
    // TRIGGER 6: Prevent deletion of payments of completed orders
    // ============================================================
    console.log('Step 6: Creating trigger to prevent payments deletion...');

    await db.query(`
        CREATE OR REPLACE FUNCTION prevent_completed_payments_delete()
        RETURNS TRIGGER AS $$
        DECLARE
            order_status VARCHAR;
        BEGIN
            -- Get the status of the parent order
            SELECT status INTO order_status
            FROM orders
            WHERE id = OLD.order_id;
            
            IF order_status = 'completed' OR order_status = 'delivered' THEN
                RAISE EXCEPTION 'Cannot delete payment after order completion. Order ID: %, Status: %', 
                    OLD.order_id, order_status
                USING ERRCODE = '23505';
            END IF;
            RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
    `);

    await db.query(`
        DROP TRIGGER IF EXISTS trigger_prevent_completed_payments_delete ON payments;
    `);

    await db.query(`
        CREATE TRIGGER trigger_prevent_completed_payments_delete
        BEFORE DELETE ON payments
        FOR EACH ROW
        EXECUTE FUNCTION prevent_completed_payments_delete();
    `);

    console.log('✅ Payments deletion protection trigger created\n');

    // ============================================================
    // Summary
    // ============================================================
    console.log('🎉 Hard immutability rules enforced at database level!\n');
    console.log('📊 Protection applied to:');
    console.log('   ✓ orders - Cannot UPDATE/DELETE if status = completed/delivered');
    console.log('   ✓ order_items - Cannot UPDATE/DELETE if parent order is completed');
    console.log('   ✓ payments - Cannot UPDATE/DELETE if parent order is completed');
    console.log('\n🔒 Security level: DATABASE ENFORCED');
    console.log('   Even if backend logic fails, DB will reject changes!\n');

    process.exit(0);
} catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
}
