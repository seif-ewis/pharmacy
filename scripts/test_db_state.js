import db from '../src/config/dataBase.js';

async function testMigration() {
    console.log('🔍 Testing database state...\n');

    try {
        // Check if shifts table exists
        try {
            const shiftsTest = await db.query('SELECT * FROM shifts LIMIT 1');
            console.log('✅ Shifts table exists');
            console.log(`   Found ${shiftsTest.rows.length} existing shifts\n`);

            // Check columns
            const columns = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'shifts'
                ORDER BY ordinal_position
            `);
            console.log('📋 Shifts table columns:');
            columns.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type}`);
            });
        } catch (err) {
            console.log('❌ Shifts table does NOT exist');
            console.log(`   Error: ${err.message}\n`);
        }

        // Check if order_status_logs exists
        try {
            const logsTest = await db.query('SELECT * FROM order_status_logs LIMIT 1');
            console.log('\n✅ order_status_logs table exists');
        } catch (err) {
            console.log('\n❌ order_status_logs table does NOT exist');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

testMigration();
