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

        // Stats for Today (Revenue and Orders)
        const dailyRes = await db.query(`
            SELECT 
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE status = 'completed' AND created_at >= CURRENT_DATE) as today_gross,
                (SELECT COALESCE(SUM(refund_amount), 0) FROM returns WHERE status = 'approved' AND created_at >= CURRENT_DATE) as today_refunds,
                (SELECT COUNT(*) FROM orders WHERE status = 'completed' AND created_at >= CURRENT_DATE) as today_orders
        `);
        const { today_gross, today_refunds, today_orders } = dailyRes.rows[0];
        const today_net = parseFloat(today_gross) - parseFloat(today_refunds);

        const total_doctors = (await db.query("SELECT COUNT(*) FROM users WHERE role = 'doctor'")).rows[0].count;
        const total_coupons = (await db.query("SELECT COUNT(*) FROM promotions WHERE is_active = true")).rows[0].count;

        // Monthly Breakdown
        const monthlyHistory = await db.query(`
            SELECT 
                to_char(created_at, 'Month YYYY') as month_label,
                COUNT(*) as total_orders,
                SUM(total_price) as total_revenue
            FROM orders
            WHERE status = 'completed'
            GROUP BY date_trunc('month', created_at), month_label
            ORDER BY date_trunc('month', created_at) DESC
            LIMIT 6
        `);

        kpiCache = {
            today_revenue: today_net.toFixed(2),
            today_orders: today_orders,
            total_doctors,
            total_coupons,
            monthly_history: monthlyHistory.rows
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
                (SELECT is_open FROM pharmacy_status_logs ORDER BY created_at DESC LIMIT 1) as is_open,
                (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE status = 'completed' AND created_at >= CURRENT_DATE) as today_revenue,
                (SELECT COUNT(*) FROM prescriptions WHERE status = 'pending') as pending_prescriptions,
                (SELECT COUNT(*) FROM medicines m LEFT JOIN medicine_stock ms ON m.id = ms.id WHERE COALESCE(ms.current_stock, 0) <= m.low_stock_threshold) as low_stock_count,
                (SELECT json_build_object(
                    'id', s.id,
                    'doctor_name', u.full_name,
                    'opened_at', s.opened_at,
                    'net_revenue', (
                        SELECT COALESCE(SUM(o.total_price), 0) 
                        FROM orders o 
                        WHERE o.shift_id = s.id AND o.status = 'completed'
                    ) - (
                        SELECT COALESCE(SUM(r.refund_amount), 0) 
                        FROM returns r 
                        WHERE r.shift_id = s.id AND r.status = 'approved'
                    ),
                    'total_orders', (
                        SELECT COUNT(*) 
                        FROM orders o 
                        WHERE o.shift_id = s.id AND o.status = 'completed'
                    ),
                    'total_returns', (
                        SELECT COUNT(*) 
                        FROM returns r 
                        WHERE r.shift_id = s.id AND r.status = 'approved'
                    )
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
            pending_prescriptions: summary.rows[0].pending_prescriptions,
            low_stock_count: summary.rows[0].low_stock_count,
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

        // 2. Success vs Variance (Completed vs Cancelled vs Returns)
        const orderMetric = await db.query(`
            SELECT 
                o.status, 
                COUNT(*) as count,
                COALESCE(SUM(o.total_price), 0) as value
            FROM orders o
            WHERE o.created_at BETWEEN $1 AND $2
            GROUP BY 1
            UNION ALL
            SELECT 
                'returned' as status,
                COUNT(*) as count,
                COALESCE(SUM(r.refund_amount), 0) as value
            FROM returns r
            WHERE r.created_at BETWEEN $1 AND $2
            GROUP BY 1
        `, [startDate, endDate]);

        // 3. Medical Performance Matrix (Doctor Efficiency)
        const doctorPerformance = await db.query(`
            SELECT 
                u.full_name, 
                COUNT(o.id) as total_orders, 
                COALESCE(SUM(o.total_price), 0) as total_revenue,
                COALESCE(AVG(o.total_price), 0) as avg_order_value,
                (SELECT COUNT(*) FROM prescription_final pf WHERE pf.approved_by = u.id AND pf.approved_at BETWEEN $1 AND $2) as prescriptions_processed
            FROM users u
            LEFT JOIN orders o ON (o.processed_by = u.id OR o.shift_id IN (SELECT id FROM shifts WHERE opened_by = u.id)) 
                 AND o.status IN ('completed', 'delivered') 
                 AND o.created_at BETWEEN $1 AND $2
            WHERE u.role = 'doctor'
            GROUP BY u.id, u.full_name 
            ORDER BY total_revenue DESC
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
// GET: Performance Ledger data (Aggregated by grain)
export const getPerformanceLedger = async (req, res) => {
    try {
        const grain = req.query.grain || 'day'; // Default to daily
        const dateFormat = grain === 'month' ? 'Month YYYY' : 'DD Mon YYYY';
        const dateTrunc = grain === 'month' ? 'month' : 'day';

        const history = await db.query(`
            WITH OrderStats AS (
                SELECT 
                    date_trunc($2, created_at) as grn,
                    COUNT(*) as total_orders,
                    SUM(total_price) as gross_revenue
                FROM orders
                WHERE status IN ('completed', 'delivered')
                GROUP BY 1
            ),
            ReturnStats AS (
                SELECT 
                    date_trunc($2, created_at) as grn,
                    COUNT(*) as total_returns,
                    SUM(refund_amount) as total_refunds
                FROM returns
                WHERE status = 'approved'
                GROUP BY 1
            )
            SELECT 
                to_char(COALESCE(o.grn, r.grn), $1) as label,
                COALESCE(o.total_orders, 0)::int as total_orders,
                COALESCE(o.gross_revenue, 0) as gross_revenue,
                COALESCE(r.total_returns, 0)::int as total_returns,
                COALESCE(r.total_refunds, 0) as total_refunds,
                (COALESCE(o.gross_revenue, 0) - COALESCE(r.total_refunds, 0)) as net_revenue
            FROM OrderStats o
            FULL OUTER JOIN ReturnStats r ON o.grn = r.grn
            ORDER BY COALESCE(o.grn, r.grn) DESC
            LIMIT 30
        `, [dateFormat, dateTrunc]);

        res.json({
            success: true,
            history: history.rows,
            grain
        });
    } catch (err) {
        console.error("Get Performance Ledger Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch ledger data" });
    }
};
