import db from '../src/config/dataBase.js';

async function diagnose() {
    try {
        const ordersRes = await db.query(`
            SELECT id, order_uid, status, return_status 
            FROM orders 
            WHERE status = 'returned' OR return_status IS NOT NULL
            ORDER BY created_at DESC
        `);

        console.log(`Found ${ordersRes.rows.length} relevant orders.\n`);

        for (const order of ordersRes.rows) {
            console.log(`==================================================`);
            console.log(`ORDER ID: ${order.id}`);
            console.log(`ORDER UID: ${order.order_uid}`);
            console.log(`DB STATUS: ${order.status}`);
            console.log(`DB RETURN_STATUS: ${order.return_status}`);

            // Total Ordered pieces
            const itemsRes = await db.query('SELECT medicine_id, quantity FROM order_items WHERE order_id = $1', [order.id]);
            const totalOrdered = itemsRes.rows.reduce((sum, r) => sum + parseInt(r.quantity), 0);
            console.log(`Order Items: ${JSON.stringify(itemsRes.rows)}`);
            console.log(`Total Pieces Ordered: ${totalOrdered}`);

            // Total Returned pieces (Approved or Pending)
            const returnsRes = await db.query(`
                SELECT r.id as return_id, r.status as return_status, ri.quantity, ri.medicine_id
                FROM returns r 
                JOIN return_items ri ON r.id = ri.return_id 
                WHERE r.order_id = $1 AND r.status = 'approved'`, [order.id]);
            const totalReturned = returnsRes.rows.reduce((sum, r) => sum + parseInt(r.quantity), 0);

            console.log(`Return Items Found (non-rejected): ${JSON.stringify(returnsRes.rows)}`);
            console.log(`Total Pieces Returned: ${totalReturned}`);

            const calculated = (totalReturned < totalOrdered) ? 'partial' : 'full';
            console.log(`Logic Result: (${totalReturned} < ${totalOrdered}) ? 'partial' : 'full' => ${calculated}`);

            if (calculated !== order.return_status) {
                console.log('!!! LOGIC MISMATCH !!!');
            }
            if (order.status === 'returned') {
                console.log('!!! STATUS SHOULD BE COMPLETED/DELIVERED, BUT IS RETURNED !!!');
            }
            console.log(`==================================================\n`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

diagnose();
