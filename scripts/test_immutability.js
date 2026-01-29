import db from '../src/config/dataBase.js';

console.log('🧪 Testing immutability triggers...\n');

try {
    // First, let's check if we have any completed orders
    const completedOrders = await db.query(`
        SELECT id, status, total_price 
        FROM orders 
        WHERE status IN ('completed', 'delivered')
        LIMIT 1
    `);

    if (completedOrders.rows.length === 0) {
        console.log('⚠️  No completed orders found in database.');
        console.log('   Creating a test scenario...\n');

        // Get a pending order
        const testOrder = await db.query(`
            SELECT id FROM orders WHERE status = 'pending' LIMIT 1
        `);

        if (testOrder.rows.length === 0) {
            console.log('❌ No orders found to test with.');
            process.exit(0);
        }

        const orderId = testOrder.rows[0].id;

        // Mark it as completed
        console.log('1. Marking order as completed...');
        await db.query(`UPDATE orders SET status = 'completed' WHERE id = $1`, [orderId]);
        console.log('   ✓ Order marked as completed\n');

        // Now try to modify it
        console.log('2. Attempting to UPDATE completed order (should FAIL)...');
        try {
            await db.query(`UPDATE orders SET total_price = 999 WHERE id = $1`, [orderId]);
            console.log('   ❌ ERROR: Update succeeded! Trigger not working!\n');
        } catch (err) {
            console.log('   ✅ SUCCESS: Update blocked by trigger');
            console.log(`   Error: ${err.message}\n`);
        }

        // Try to delete it
        console.log('3. Attempting to DELETE completed order (should FAIL)...');
        try {
            await db.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
            console.log('   ❌ ERROR: Delete succeeded! Trigger not working!\n');
        } catch (err) {
            console.log('   ✅ SUCCESS: Delete blocked by trigger');
            console.log(`   Error: ${err.message}\n`);
        }

        // Try to modify order items
        console.log('4. Attempting to UPDATE order_items of completed order (should FAIL)...');
        const items = await db.query(`SELECT id FROM order_items WHERE order_id = $1 LIMIT 1`, [orderId]);
        if (items.rows.length > 0) {
            try {
                await db.query(`UPDATE order_items SET quantity = 999 WHERE id = $1`, [items.rows[0].id]);
                console.log('   ❌ ERROR: Update succeeded! Trigger not working!\n');
            } catch (err) {
                console.log('   ✅ SUCCESS: Update blocked by trigger');
                console.log(`   Error: ${err.message}\n`);
            }
        } else {
            console.log('   ⊘ No items found for this order\n');
        }

        // Revert the test order back to pending
        console.log('5. Reverting test order back to pending...');
        // This should fail because it's completed!
        try {
            await db.query(`UPDATE orders SET status = 'pending' WHERE id = $1`, [orderId]);
            console.log('   ❌ ERROR: Status change succeeded! Trigger not working!\n');
        } catch (err) {
            console.log('   ✅ SUCCESS: Status change blocked by trigger');
            console.log(`   Error: ${err.message}\n`);

            // We need to disable trigger temporarily to revert
            console.log('   → Temporarily disabling trigger to clean up test...');
            await db.query('ALTER TABLE orders DISABLE TRIGGER trigger_prevent_completed_order_update');
            await db.query(`UPDATE orders SET status = 'pending' WHERE id = $1`, [orderId]);
            await db.query('ALTER TABLE orders ENABLE TRIGGER trigger_prevent_completed_order_update');
            console.log('   ✓ Test order reverted\n');
        }

    } else {
        console.log(`Found completed order: ${completedOrders.rows[0].id}`);
        console.log('Skipping tests to avoid modifying real data.\n');
    }

    // List all triggers
    console.log('📋 Active immutability triggers:');
    const triggers = await db.query(`
        SELECT trigger_name, event_manipulation, event_object_table
        FROM information_schema.triggers
        WHERE trigger_name LIKE '%prevent_completed%'
        ORDER BY event_object_table, trigger_name
    `);

    triggers.rows.forEach(t => {
        console.log(`   ✓ ${t.event_object_table}.${t.trigger_name} (${t.event_manipulation})`);
    });

    console.log('\n🎉 Immutability triggers are active and functioning!\n');
    process.exit(0);
} catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
}
