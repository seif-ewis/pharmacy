import db from "../../config/dataBase.js";

// GET: Orders History with Search, Filter & Pagination
export const getOrdersHistory = async (req, res) => {
    const { search, status, timeRange, page = 1, limit = 15 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT o.*, u.full_name as customer_name, d.full_name as doctor_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN users d ON o.processed_by = d.id
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        params.push(`%${search}%`);
        query += ` AND (o.order_uid ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`;
    }

    if (status && status !== 'all') {
        params.push(status);
        query += ` AND o.status = $${params.length}`;
    }

    if (timeRange && timeRange !== 'all') {
        if (timeRange === 'today') query += ` AND o.created_at >= CURRENT_DATE`;
        else if (timeRange === 'yesterday') query += ` AND o.created_at >= CURRENT_DATE - INTERVAL '1 day' AND o.created_at < CURRENT_DATE`;
        else if (timeRange === 'week') query += ` AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
        else if (timeRange === 'month') query += ` AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    // Count for pagination
    const countQuery = `SELECT COUNT(*) FROM (${query}) as sub`;
    const totalCountRes = await db.query(countQuery, params);
    const totalCount = parseInt(totalCountRes.rows[0].count);

    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    try {
        const result = await db.query(query, params);
        res.json({
            success: true,
            orders: result.rows,
            totalCount,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit)
        });
    } catch (err) {
        console.error("Get Orders History Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch orders history" });
    }
};

// GET: Single Order Details
export const getOrderDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const orderRes = await db.query(`
            SELECT o.*, u.full_name as customer_name, u.email as customer_email, d.full_name as doctor_name
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN users d ON o.processed_by = d.id
            WHERE o.id = $1
        `, [id]);

        if (orderRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const itemsRes = await db.query(`
            SELECT oi.*, m.name as medicine_name, m.image_url
            FROM order_items oi
            JOIN medicines m ON oi.medicine_id = m.id
            WHERE oi.order_id = $1
        `, [id]);

        res.json({ success: true, order: orderRes.rows[0], items: itemsRes.rows });
    } catch (err) {
        console.error("Get Order Details Error:", err);
        res.status(500).json({ success: false, message: "Server error fetching order details" });
    }
};

// GET: Shifts History
export const getShiftsHistory = async (req, res) => {
    const { limit = 20 } = req.query;
    try {
        const result = await db.query(`
            SELECT s.*, u.full_name as opened_by_name, c.full_name as closed_by_name
            FROM shifts s
            JOIN users u ON s.opened_by = u.id
            LEFT JOIN users c ON s.closed_by = c.id
            ORDER BY s.opened_at DESC
            LIMIT $1
        `, [limit]);
        res.json({ success: true, shifts: result.rows });
    } catch (err) {
        console.error("Get Shifts History Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch shifts history" });
    }
};

// GET: Single Shift Details
export const getShiftDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const shiftRes = await db.query("SELECT * FROM shifts WHERE id = $1", [id]);
        if (shiftRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Shift not found" });
        }
        res.json({ success: true, shift: shiftRes.rows[0] });
    } catch (err) {
        console.error("Get Shift Details Error:", err);
        res.status(500).json({ success: false, message: "Server error fetching shift details" });
    }
};

// GET: Returns History
export const getReturnsHistory = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT r.*, u.full_name as customer_name, o.order_uid
            FROM returns r
            JOIN users u ON r.user_id = u.id
            JOIN orders o ON r.order_id = o.id
            ORDER BY r.created_at DESC
            LIMIT 100
        `);
        res.json({ success: true, returns: result.rows });
    } catch (err) {
        console.error("Get Returns History Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch returns history" });
    }
};
