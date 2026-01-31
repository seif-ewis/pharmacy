const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function debugOrder(orderUid) {
    try {
        console.log(`Debugging Order: ${orderUid}`);

        const orderRes = await db.query("SELECT id, status, return_status, order_uid FROM orders WHERE order_uid = $1", [orderUid]);
        if (orderRes.rows.length === 0) {
            console.log("Order not found");
            return;
        }
        const orderId = orderRes.rows[0].id;
        console.log("Order Details:", orderRes.rows[0]);

        const qtyCheck = await db.query(`
            SELECT 
                (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = $1) as total_qty,
                (SELECT COALESCE(SUM(quantity), 0) FROM return_items ri JOIN returns r ON ri.return_id = r.id WHERE r.order_id = $1) as returned_qty
        `, [orderId]);

        const totalQty = Number(qtyCheck.rows[0].total_qty);
        const returnedQty = Number(qtyCheck.rows[0].returned_qty);

        console.log(`Toal Qty: ${totalQty}, Returned Qty: ${returnedQty}`);
        console.log(`Calculated Status: ${(returnedQty < totalQty) ? 'partial' : 'full'}`);

    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

// Replace with a known order UID that failed if possible, or just test logic
const args = process.argv.slice(2);
if (args.length > 0) {
    debugOrder(args[0]);
} else {
    console.log("Please provide order UID argument");
    // List latest 5 completed orders to help
    db.query("SELECT order_uid, status FROM orders WHERE status='completed' OR status='delivered' ORDER BY created_at DESC LIMIT 5")
        .then(res => {
            console.log("Recent Orders:", res.rows);
            db.end();
        });
}
