import db from "../../config/dataBase.js";

// GET: Inventory Items with Status
export const getInventory = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT m.id, m.name, COALESCE(ms.current_stock, 0) as quantity, m.low_stock_threshold, m.price,
            CASE 
                WHEN COALESCE(ms.current_stock, 0) <= 0 THEN 'OUT'
                WHEN COALESCE(ms.current_stock, 0) <= m.low_stock_threshold THEN 'LOW'
                ELSE 'OK'
            END as stock_status
            FROM medicines m
            LEFT JOIN medicine_stock ms ON m.id = ms.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            query += ` AND m.name ILIKE $${params.length}`;
        }

        if (status && status !== 'all') {
            if (status === 'OUT') query += ` AND COALESCE(ms.current_stock, 0) <= 0`;
            else if (status === 'LOW') query += ` AND COALESCE(ms.current_stock, 0) > 0 AND COALESCE(ms.current_stock, 0) <= m.low_stock_threshold`;
            else if (status === 'OK') query += ` AND COALESCE(ms.current_stock, 0) > m.low_stock_threshold`;
        }

        query += ` ORDER BY stock_status DESC, m.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        const countRes = await db.query("SELECT COUNT(*) FROM medicines");

        res.json({
            success: true,
            items: result.rows,
            totalCount: countRes.rows[0].count,
            currentPage: parseInt(page),
            totalPages: Math.ceil(countRes.rows[0].count / limit)
        });
    } catch (err) {
        console.error("Get Inventory Error:", err);
        res.status(500).json({ success: false });
    }
};

// GET: Inventory Logs (Append-Only)
export const getInventoryLogs = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const result = await db.query(`
            SELECT logs.*, m.name as medicine_name, u.full_name as actor_name
            FROM inventory_adjustments logs
            JOIN medicines m ON logs.medicine_id = m.id
            LEFT JOIN users u ON logs.performed_by = u.id
            ORDER BY logs.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const countRes = await db.query("SELECT COUNT(*) FROM inventory_adjustments");

        res.json({
            success: true,
            logs: result.rows,
            totalCount: countRes.rows[0].count,
            currentPage: parseInt(page),
            totalPages: Math.ceil(countRes.rows[0].count / limit)
        });
    } catch (err) {
        console.error("Get Inventory Logs Error:", err);
        res.status(500).json({ success: false });
    }
};

// POST: Adjust Stock (Append-only)
export const adjustStock = async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const { medicine_id, change, reason } = req.body;
        const actor_id = req.user.id;

        // In this system, stock is computed from ILLEGAL (direct) updates aren't allowed.
        // We only insert into inventory_adjustments and the VIEW 'medicine_stock' handles the rest.
        await client.query(`
            INSERT INTO inventory_adjustments (medicine_id, quantity_change, adjustment_type, performed_by, reason)
            VALUES ($1, $2, $3, $4, $5)
        `, [medicine_id, change, change > 0 ? 'manual_increase' : 'manual_decrease', actor_id, reason]);

        // Get new stock from view
        const stockRes = await client.query('SELECT current_stock FROM medicine_stock WHERE id = $1', [medicine_id]);
        const newQuantity = stockRes.rows[0]?.current_stock || 0;

        await client.query('COMMIT');
        res.json({ success: true, newQuantity });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Adjust Stock Error:", err);
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
};
