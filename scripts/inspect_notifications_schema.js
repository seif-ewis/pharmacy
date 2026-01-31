
import db from '../src/config/dataBase.js';

async function run() {
    console.log('--- Inspecting Notifications Table ---');
    try {
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'notifications';
        `);
        res.rows.forEach(r => console.log(r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
