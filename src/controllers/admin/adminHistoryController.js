import db from "../../config/dataBase.js";

// GET: Orders History with Search, Filter & Pagination
export const getOrdersHistory = async (req, res) => {
    const { search, status, timeRange, page = 1, limit = 5 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT o.*, u.full_name as customer_name, 
               COALESCE(d.full_name, sd.full_name, 'System') as doctor_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN users d ON o.processed_by = d.id
        LEFT JOIN shifts s ON o.shift_id = s.id
        LEFT JOIN users sd ON s.opened_by = sd.id
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
            SELECT oi.*, m.name as medicine_name, m.image_url,
                   (SELECT COALESCE(SUM(ri.quantity), 0) FROM return_items ri JOIN returns r ON ri.return_id = r.id WHERE r.order_id = $1 AND ri.medicine_id = oi.medicine_id AND r.status = 'approved') as returned_quantity
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

// GET: Shifts History (Paginated)
export const getShiftsHistory = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    try {
        // Count total shifts
        const countRes = await db.query("SELECT COUNT(*) FROM shifts");
        const totalCount = parseInt(countRes.rows[0].count);
        const totalPages = Math.ceil(totalCount / limit);

        const result = await db.query(`
            SELECT s.*, u.full_name as opened_by_name, c.full_name as closed_by_name
            FROM shifts s
            JOIN users u ON s.opened_by = u.id
            LEFT JOIN users c ON s.closed_by = c.id
            ORDER BY s.opened_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        res.json({
            success: true,
            shifts: result.rows,
            totalCount,
            totalPages,
            currentPage: page
        });
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
            LIMIT 10
        `);
        res.json({ success: true, returns: result.rows });
    } catch (err) {
        console.error("Get Returns History Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch returns history" });
    }
};

// GET: Inventory Adjustments History
export const getInventoryHistory = async (req, res) => {
    const { search, performedBy } = req.query;
    let query = `
        SELECT ia.id, ia.medicine_id, ia.quantity_change, ia.adjustment_type, ia.reason, ia.created_at,
               m.name as medicine_name, 
               COALESCE(u.full_name, sd.full_name, 'System') as performer_name
        FROM inventory_adjustments ia
        JOIN medicines m ON ia.medicine_id = m.id
        LEFT JOIN users u ON ia.performed_by = u.id
        LEFT JOIN shifts s ON ia.reason ILIKE '%' || s.id || '%'
        LEFT JOIN users sd ON s.opened_by = sd.id
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        params.push(`%${search}%`);
        query += ` AND (m.name ILIKE $${params.length} OR u.full_name ILIKE $${params.length} OR sd.full_name ILIKE $${params.length})`;
    }

    if (performedBy && performedBy !== 'all') {
        params.push(performedBy);
        query += ` AND (ia.performed_by = $${params.length} OR s.opened_by = $${params.length})`;
    }

    const type = req.query.type;
    if (type && type !== 'all') {
        params.push(type);
        query += ` AND ia.adjustment_type = $${params.length}`;
    }

    query += ` ORDER BY ia.created_at DESC LIMIT 10`;

    try {
        const result = await db.query(query, params);
        res.json({ success: true, adjustments: result.rows });
    } catch (err) {
        console.error("Get Inventory History Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch inventory history" });
    }
};

// GET: Shifts for a specific doctor
export const getDoctorShifts = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`
            SELECT s.*, u.full_name as opened_by_name
            FROM shifts s
            JOIN users u ON s.opened_by = u.id
            WHERE s.opened_by = $1
            ORDER BY s.opened_at DESC
            LIMIT 10
        `, [id]);
        res.json({ success: true, shifts: result.rows });
    } catch (err) {
        console.error("Get Doctor Shifts Error:", err);
        res.status(500).json({ success: false });
    }
};

// GET: Orders for a specific user
export const getUserOrders = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`
            SELECT o.*, d.full_name as doctor_name
            FROM orders o
            LEFT JOIN users d ON o.processed_by = d.id
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC
            LIMIT 10
        `, [id]);
        res.json({ success: true, orders: result.rows });
    } catch (err) {
        console.error("Get User Orders Error:", err);
        res.status(500).json({ success: false });
    }
};
