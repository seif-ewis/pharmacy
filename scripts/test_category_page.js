
import db from '../src/config/dataBase.js';

async function run() {
    console.log('--- Testing Category Page Query ---');
    try {
        // Test query with LEFT JOIN and COALESCE
        const query = `
            SELECT m.id, m.name, COALESCE(ms.current_stock, 0) as quantity
            FROM medicines m
            LEFT JOIN medicine_stock ms ON m.id = ms.id
            LIMIT 5
        `;

        const res = await db.query(query);
        console.log(`✅ Query Successful. Retrieved ${res.rows.length} items.`);
        if (res.rows.length > 0) {
            console.log('Sample Item:', res.rows[0]);
            if (res.rows[0].quantity === undefined) {
                console.error('❌ FAILED: quantity column missing');
            } else {
                console.log('✅ PASSED: quantity column exists');
            }
        }
    } catch (err) {
        console.error('❌ FATAL: Query Failed', err);
    } finally {
        process.exit();
    }
}

run();
