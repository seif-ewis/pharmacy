
import db from '../src/config/dataBase.js';

async function run() {
    console.log('--- Inspecting Users Table ---');
    try {
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.log("Columns:", res.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
