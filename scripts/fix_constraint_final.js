
import db from '../src/config/dataBase.js';

async function run() {
    console.log('--- Fixing Constraints ---');
    try {
        // 1. Drop details first to allow updates if needed, though check happens on update too.
        // It's safer to DROP the constraint first.
        await db.query(`ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_target_audience_check;`);

        // 2. Normalize data
        await db.query(`UPDATE announcements SET target_audience = 'customers' WHERE target_audience = 'customer';`);

        // 3. Re-add Constraint
        await db.query(`
            ALTER TABLE announcements 
            ADD CONSTRAINT announcements_target_audience_check 
            CHECK (target_audience IN ('all', 'staff', 'active_orders', 'customers', 'doctors', 'admins'));
        `);
        console.log('Success: Data normalized and constraint updated.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}
run();
