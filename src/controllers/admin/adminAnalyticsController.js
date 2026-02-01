import db from "../../config/dataBase.js";

// GET: Global Dashboard Stats
export const getGlobalStats = async (req, res) => {
    try {
        // Total Net Revenue (Completed Orders - Approved Returns)
        const revRes = await db.query(`
            SELECT 
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE status = 'completed') as gross_rev,
                (SELECT COALESCE(SUM(refund_amount), 0) FROM returns WHERE status = 'approved') as total_refunds
        `);
        const { gross_rev, total_refunds } = revRes.rows[0];
        const net_rev = parseFloat(gross_rev) - parseFloat(total_refunds);

        // Total Orders
        const orderCountRes = await db.query("SELECT COUNT(*) FROM orders");
        const total_orders = orderCountRes.rows[0].count;

        // Active Doctors (Users with role doctor)
        const doctorCountRes = await db.query("SELECT COUNT(*) FROM users WHERE role = 'doctor'");
        const total_doctors = doctorCountRes.rows[0].count;

        // Active Coupons (Public and Active promotions)
        const couponCountRes = await db.query("SELECT COUNT(*) FROM promotions WHERE is_active = true");
        const total_coupons = couponCountRes.rows[0].count;

        res.json({
            success: true,
            stats: {
                net_revenue: net_rev.toFixed(2),
                total_orders,
                total_doctors,
                total_coupons
            }
        });
    } catch (err) {
        console.error("Get Global Stats Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
};
