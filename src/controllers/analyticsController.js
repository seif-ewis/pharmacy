
// Doctor Analytics Report - Revenue, Orders, Returns, Turnover
import db from '../config/dataBase.js';

export const getDoctorAnalytics = async (req, res) => {
    try {
        const { range } = req.query; // '7', '30', '90'
        const days = parseInt(range) || 30;

        // 1. Net Revenue Over Time (Earned on completed_at, Reversed on returned_at)
        const revenueRes = await db.query(`
            WITH RECURSIVE dates AS (
                SELECT CURRENT_DATE - ($1 * INTERVAL '1 day') AS date
                UNION ALL
                SELECT date + INTERVAL '1 day'
                FROM dates
                WHERE date < CURRENT_DATE
            ),
            daily_stats AS (
                SELECT 
                    DATE(completed_at) as event_date,
                    SUM(total_price) as earned,
                    0 as reversed
                FROM orders
                WHERE completed_at IS NOT NULL
                AND completed_at >= CURRENT_DATE - ($1 * INTERVAL '1 day')
                GROUP BY 1
                UNION ALL
                SELECT 
                    DATE(returned_at) as event_date,
                    0 as earned,
                    SUM(total_price) as reversed
                FROM orders
                WHERE returned_at IS NOT NULL
                AND returned_at >= CURRENT_DATE - ($1 * INTERVAL '1 day')
                GROUP BY 1
            )
            SELECT 
                d.date,
                COALESCE(SUM(s.earned - s.reversed), 0) as amount
            FROM dates d
            LEFT JOIN daily_stats s ON d.date = s.event_date
            GROUP BY d.date
            ORDER BY d.date ASC
        `, [days]);

        // 2. Successful Orders Over Time (Grouped by completed_at)
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
            LEFT JOIN orders o ON DATE(o.completed_at) = DATE(d.date) AND o.completed_at IS NOT NULL
            GROUP BY d.date
            ORDER BY d.date ASC
        `, [days]);

        // 3. Returns vs Sales (Pie Chart Data) - Operational view
        const returnVsSalesRes = await db.query(`
            SELECT 
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE completed_at IS NOT NULL AND completed_at >= NOW() - ($1 * INTERVAL '1 day')) as sales,
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE returned_at IS NOT NULL AND returned_at >= NOW() - ($1 * INTERVAL '1 day')) as returns
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

        // 5. Inventory Turnover (Top Selling Medicines - by completed_at)
        const topMoversRes = await db.query(`
            SELECT 
                m.name,
                SUM(oi.quantity) as total_sold,
                SUM(oi.price * oi.quantity) as revenue
            FROM order_items oi
            JOIN medicines m ON oi.medicine_id = m.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.completed_at IS NOT NULL
            AND o.completed_at >= NOW() - ($1 * INTERVAL '1 day')
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
