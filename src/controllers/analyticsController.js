
// Doctor Analytics Report - Revenue, Orders, Returns, Turnover
import db from '../config/dataBase.js';

export const getDoctorAnalytics = async (req, res) => {
    try {
        const { range } = req.query; // '7', '30', '90'
        const days = parseInt(range) || 30;

        // 1. Revenue Over Time (Gross - Returns)
        const revenueRes = await db.query(`
            WITH RECURSIVE dates AS (
                SELECT CURRENT_DATE - ($1 * INTERVAL '1 day') AS date
                UNION ALL
                SELECT date + INTERVAL '1 day'
                FROM dates
                WHERE date < CURRENT_DATE
            )
            SELECT 
                d.date,
                COALESCE(SUM(o.total_price), 0) - COALESCE(SUM(r.refund_amount), 0) as amount
            FROM dates d
            LEFT JOIN orders o ON DATE(o.created_at) = DATE(d.date) AND o.status IN ('completed', 'delivered')
            LEFT JOIN returns r ON DATE(r.created_at) = DATE(d.date) AND r.status = 'approved'
            GROUP BY d.date
            ORDER BY d.date ASC
        `, [days]);

        // 2. Orders Over Time
        const ordersRes = await db.query(`
            WITH RECURSIVE dates AS (
                SELECT CURRENT_DATE - ($1 * INTERVAL '1 day') AS date
                UNION ALL
                SELECT date + INTERVAL '1 day'
                FROM dates
                WHERE date < CURRENT_DATE
            )
            SELECT 
                d.date,
                COUNT(o.id) as count
            FROM dates d
            LEFT JOIN orders o ON DATE(o.created_at) = DATE(d.date) AND o.status IN ('completed', 'delivered', 'pending', 'processing')
            GROUP BY d.date
            ORDER BY d.date ASC
        `, [days]);

        // 3. Returns vs Sales (Pie Chart Data)
        const returnVsSalesRes = await db.query(`
            SELECT 
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')) as sales,
                (SELECT COALESCE(SUM(refund_amount), 0) FROM returns WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')) as returns
        `, [days]);

        // 4. Requested Medicines Stats (Category distribution from product_requests is tricky if no category, so we group by name)
        const requestsRes = await db.query(`
             SELECT product_name as name, COUNT(*) as count 
             FROM product_requests 
             WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
             GROUP BY product_name 
             ORDER BY count DESC 
             LIMIT 5
        `, [days]);

        // 5. Inventory Turnover (Top Selling Medicines)
        const topMoversRes = await db.query(`
            SELECT 
                m.name,
                SUM(oi.quantity) as total_sold,
                SUM(oi.price * oi.quantity) as revenue
            FROM order_items oi
            JOIN medicines m ON oi.medicine_id = m.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status IN ('completed', 'delivered')
            AND o.created_at >= NOW() - ($1 * INTERVAL '1 day')
            GROUP BY m.name
            ORDER BY total_sold DESC
            LIMIT 10
        `, [days]);

        res.json({
            success: true,
            analytics: {
                revenueOverTime: revenueRes.rows,
                ordersOverTime: ordersRes.rows,
                returnsVsSales: returnVsSalesRes.rows[0],
                requestsStats: requestsRes.rows,
                topMovers: topMoversRes.rows
            }
        });

    } catch (err) {
        console.error("Analytics Error:", err);
        res.status(500).json({ success: false, error: "Failed to load analytics" });
    }
};
