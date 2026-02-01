import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ user: 'postgres', host: 'localhost', database: 'hosam', password: '123456', port: 5432 });
client.connect().then(async () => {
    try {
        const activeShift = await client.query("SELECT id FROM shifts WHERE status = 'open' LIMIT 1");
        if (activeShift.rows.length === 0) {
            console.log('No active shift found');
            return;
        }
        const sid = activeShift.rows[0].id;
        console.log('Active Shift ID:', sid);

        const returns = await client.query("SELECT * FROM returns WHERE shift_id = $1", [sid]);
        console.log('Returns in this shift:', returns.rows);

        const metrics = await client.query(`
            SELECT 
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE completed_shift_id = $1) as gross,
                (SELECT COALESCE(SUM(refund_amount), 0) FROM returns WHERE shift_id = $1 AND status = 'approved') as refunds
        `, [sid]);
        console.table(metrics.rows);

    } catch (e) {
        console.error(e);
    } finally {
        client.end();
    }
});
