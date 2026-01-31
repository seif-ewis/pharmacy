
import db from '../src/config/dataBase.js';

async function run() {
    console.log('--- Inspecting Announcements Constraints ---');
    try {
        const res = await db.query(`
            SELECT con.conname, pg_get_constraintdef(con.oid)
            FROM pg_catalog.pg_constraint con
            INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
            INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace
            WHERE nsp.nspname = 'public'
            AND rel.relname = 'announcements';
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
