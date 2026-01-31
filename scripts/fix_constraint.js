
import db from '../src/config/dataBase.js';

async function run() {
    console.log('--- Updating Constraint ---');
    try {
        await db.query(`
            ALTER TABLE announcements 
            DROP CONSTRAINT IF EXISTS announcements_target_audience_check;
        `);
        console.log('Dropped old constraint.');

        await db.query(`
            ALTER TABLE announcements 
            ADD CONSTRAINT announcements_target_audience_check 
            CHECK (target_audience IN ('all', 'staff', 'active_orders', 'customers', 'doctors', 'admins'));
        `);
        console.log('Added new constraint with updated values.');

    } catch (err) {
        console.error('Error updating constraint:', err);
    } finally {
        process.exit();
    }
}
run();
