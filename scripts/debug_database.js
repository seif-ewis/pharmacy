import db from '../src/config/dataBase.js';

async function main() {
    try {
        const res = await db.query(`
            SELECT 
                tgname as trigger_name
            FROM pg_trigger 
            WHERE tgrelid = 'orders'::regclass
            AND tgisinternal = false
        `);
        console.log('Triggers on orders table:');
        console.table(res.rows);

        const funcs = await db.query(`
            SELECT 
                proname as function_name
            FROM pg_proc 
            WHERE proname IN ('prevent_completed_order_update', 'fn_enforce_order_immutability')
        `);
        console.log('Relevant functions:');
        console.table(funcs.rows);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

main();
