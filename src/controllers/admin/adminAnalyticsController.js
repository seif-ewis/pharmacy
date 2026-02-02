import db from "../../config/dataBase.js";

// KPI Cache (30s TTL as per commandment)
let kpiCache = null;
let lastCacheUpdate = 0;

// GET: Global Dashboard Stats (Cached)
export const getGlobalStats = async (req, res) => {
    try {
        const now = Date.now();
        if (kpiCache && (now - lastCacheUpdate < 30000)) {
            return res.json({ success: true, stats: kpiCache, cached: true });
        }

        // Total Net Revenue (Completed Orders - Approved Returns)
        const revRes = await db.query(`
            SELECT 
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE status = 'completed') as gross_rev,
                (SELECT COALESCE(SUM(refund_amount), 0) FROM returns WHERE status = 'approved') as total_refunds
        `);
        const { gross_rev, total_refunds } = revRes.rows[0];
        const net_rev = parseFloat(gross_rev) - parseFloat(total_refunds);

        const total_orders = (await db.query("SELECT COUNT(*) FROM orders")).rows[0].count;
        const total_doctors = (await db.query("SELECT COUNT(*) FROM users WHERE role = 'doctor'")).rows[0].count;
        const total_coupons = (await db.query("SELECT COUNT(*) FROM promotions WHERE is_active = true")).rows[0].count;

        kpiCache = {
            net_revenue: net_rev.toFixed(2),
            total_orders,
            total_doctors,
            total_coupons
        };
        lastCacheUpdate = now;

        res.json({ success: true, stats: kpiCache, cached: false });
    } catch (err) {
        console.error("Get Global Stats Error:", err);
        res.status(500).json({ success: false });
    }
};

// GET: Dashboard Summary (Revenue polling every 15s)
export const getDashboardSummary = async (req, res) => {
    try {
        // Today's Revenue and Active Shift Info
        const summary = await db.query(`
            SELECT 
                (SELECT is_open FROM pharmacy_settings ORDER BY created_at DESC LIMIT 1) as is_open,
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE status = 'completed' AND created_at >= CURRENT_DATE) as today_revenue,
                (SELECT json_build_object(
                    'id', s.id,
                    'doctor_name', u.full_name,
                    'opened_at', s.opened_at,
                    'net_revenue', s.net_revenue,
                    'total_orders', s.total_orders,
                    'total_returns', s.total_returns
                ) FROM shifts s
                  JOIN users u ON s.opened_by = u.id
                  WHERE s.status = 'open'
                  ORDER BY s.opened_at DESC
                  LIMIT 1) as active_shift
        `);

        res.json({
            success: true,
            is_open: summary.rows[0].is_open,
            today_revenue: summary.rows[0].today_revenue,
            active_shift: summary.rows[0].active_shift
        });
    } catch (err) {
        console.error("Get summary error:", err);
        res.status(500).json({ success: false });
    }
};

// GET: Detailed Analytics (Date range required)
export const getDetailedAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ success: false, message: "Date range required" });

        // 1. Revenue Over Time
        const revenueTime = await db.query(`
            SELECT date_trunc('day', created_at) as date, SUM(total_price) as revenue
            FROM orders
            WHERE status = 'completed' AND created_at BETWEEN $1 AND $2
            GROUP BY 1 ORDER BY 1 ASC
        `, [startDate, endDate]);

        // 2. Orders vs Returns
        const orderMetric = await db.query(`
            SELECT status, COUNT(*) as count
            FROM orders
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY 1
        `, [startDate, endDate]);

        // 3. Doctor Performance
        const doctorPerformance = await db.query(`
            SELECT u.full_name, COUNT(o.id) as orders, SUM(o.total_price) as revenue
            FROM users u
            JOIN orders o ON o.processed_by = u.id
            WHERE u.role = 'doctor' AND o.created_at BETWEEN $1 AND $2
            GROUP BY 1 ORDER BY revenue DESC
        `, [startDate, endDate]);

        res.json({
            success: true,
            revenueTime: revenueTime.rows,
            orderMetrics: orderMetric.rows,
            doctorPerformance: doctorPerformance.rows
        });
    } catch (err) {
        console.error("Detailed analytics error:", err);
        res.status(500).json({ success: false });
    }
};
