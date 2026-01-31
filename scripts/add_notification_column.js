
import db from '../src/config/dataBase.js';

async function run() {
    console.log('--- Adding related_id to notifications ---');
    try {
        await db.query(`
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS related_id UUID;
        `);
        console.log('Added related_id column.');
    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        process.exit();
    }
}
run();
