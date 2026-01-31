
import db from '../src/config/dataBase.js';
import { createOrder } from '../src/controllers/orderController.js';
import { logAdjustment } from '../src/controllers/inventoryController.js';

async function run() {
    console.log('--- Testing Checkout & Shift Attribution ---');

    // Setup: Get open shift owner and a DIFFERENT user for the customer
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Open Shift
        const shiftRes = await client.query("SELECT id, opened_by FROM shifts WHERE status = 'open' LIMIT 1");
        if (shiftRes.rows.length === 0) throw new Error("No open shift found to test against");
        const activeShift = shiftRes.rows[0];
        console.log(`✅ Found Open Shift: ${activeShift.id} (Owner: ${activeShift.opened_by})`);

        // 2. Get User who is NOT the owner
        const userRes = await client.query("SELECT id FROM users WHERE id != $1 LIMIT 1", [activeShift.opened_by]);
        if (userRes.rows.length === 0) throw new Error("No separate user found for customer role");
        const customerId = userRes.rows[0].id;
        console.log(`✅ Using Customer ID: ${customerId} (Different from Shift Owner)`);

        // 3. Get Medicine & Stock
        const medRes = await client.query("SELECT id FROM medicines LIMIT 1");
        const medId = medRes.rows[0].id;

        // 4. Test Manual Adjustment (Should FAIL for customer)
        console.log('--- Test 1: Manual Adjustment by Customer (Should Fail) ---');
        try {
            await logAdjustment(client, medId, 'manual_adjustment', -1, null, customerId, 'Test Fail', activeShift.id);
            console.error('❌ Test 1 FAILED: Manual adjustment should have thrown error');
        } catch (e) {
            if (e.message.includes("Cannot log adjustment to another user's shift")) {
                console.log('✅ Test 1 PASSED: Correctly blocked manual adjustment');
            } else {
                console.error(`❌ Test 1 FAILED: Wrong error message: ${e.message}`);
            }
        }

        // 5. Test Scale/Order (Should SUCCEED for customer)
        console.log('--- Test 2: Sale by Customer (Should Succeed) ---');
        try {
            // Use a valid UUID for reference ID
            const mockOrderId = '00000000-0000-0000-0000-000000000000';
            await logAdjustment(client, medId, 'sale', -1, mockOrderId, customerId, 'Test Order', activeShift.id);
            console.log('✅ Test 2 PASSED: Sale logged successfully against active shift');
        } catch (e) {
            console.error(`❌ Test 2 FAILED: Sale blocked: ${e.message}`);
            throw e;
        }

        await client.query('ROLLBACK'); // Don't persist test data
        console.log('✅ All Checkout Tests Passed (Rolled Back)');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ FATAL TEST FAILURE:', err);
    } finally {
        client.release();
        process.exit();
    }
}

run();
