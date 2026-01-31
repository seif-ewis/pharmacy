
import db from '../src/config/dataBase.js';

async function run() {
    console.log('--- Checking Distinct Targets ---');
    try {
        const res = await db.query(`SELECT DISTINCT target_audience FROM announcements;`);
        console.log("Values:", res.rows.map(r => r.target_audience).join(', '));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
