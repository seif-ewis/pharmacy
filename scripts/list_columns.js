import db from '../src/config/dataBase.js';

async function listCols() {
    try {
        const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        console.log('--- USERS TABLE COLUMNS ---');
        res.rows.forEach(r => console.log(r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
listCols();
