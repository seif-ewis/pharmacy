import db from "../../config/dataBase.js";

// GET: Orders History with Search & Filter
export const getOrdersHistory = async (req, res) => {
    const { search, status } = req.query;
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

    query += ` ORDER BY o.created_at DESC LIMIT 100`;

    try {
        const result = await db.query(query, params);
        res.json({ success: true, orders: result.rows });
    } catch (err) {
        console.error("Get Orders History Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch orders history" });
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

// GET: Shifts History
export const getShiftsHistory = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, u.full_name as opened_by_name, c.full_name as closed_by_name
            FROM shifts s
            JOIN users u ON s.opened_by = u.id
            LEFT JOIN users c ON s.closed_by = c.id
            ORDER BY s.opened_at DESC
            LIMIT 50
        `);
        res.json({ success: true, shifts: result.rows });
    } catch (err) {
        console.error("Get Shifts History Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch shifts history" });
    }
};

// GET: Inventory Adjustments History
export const getInventoryHistory = async (req, res) => {
    const { search } = req.query;
    let query = `
        SELECT ia.*, m.name as medicine_name, u.full_name as performer_name
        FROM inventory_adjustments ia
        JOIN medicines m ON ia.medicine_id = m.id
        LEFT JOIN users u ON ia.performed_by = u.id
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        params.push(`%${search}%`);
        query += ` AND (m.name ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`;
    }

    query += ` ORDER BY ia.created_at DESC LIMIT 100`;

    try {
        const result = await db.query(query, params);
        res.json({ success: true, adjustments: result.rows });
    } catch (err) {
        console.error("Get Inventory History Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch inventory history" });
    }
};
