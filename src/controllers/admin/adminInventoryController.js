import db from "../../config/dataBase.js";

// GET: Inventory Items with Status
export const getInventory = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT id, name, quantity, low_stock_threshold, price,
            CASE 
                WHEN quantity <= 0 THEN 'OUT'
                WHEN quantity <= low_stock_threshold THEN 'LOW'
                ELSE 'OK'
            END as stock_status
            FROM medicines
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            query += ` AND name ILIKE $${params.length}`;
        }

        if (status && status !== 'all') {
            if (status === 'OUT') query += ` AND quantity <= 0`;
            else if (status === 'LOW') query += ` AND quantity > 0 AND quantity <= low_stock_threshold`;
            else if (status === 'OK') query += ` AND quantity > low_stock_threshold`;
        }

        query += ` ORDER BY stock_status DESC, name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
        const { page = 1, limit = 20 } = req.query;
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

        const updateRes = await client.query(`
            UPDATE medicines 
            SET quantity = quantity + $1 
            WHERE id = $2 
            RETURNING quantity
        `, [change, medicine_id]);

        await client.query(`
            INSERT INTO inventory_adjustments (medicine_id, quantity_change, adjustment_type, performed_by, reason)
            VALUES ($1, $2, $3, $4, $5)
        `, [medicine_id, change, change > 0 ? 'increase' : 'decrease', actor_id, reason]);

        await client.query('COMMIT');
        res.json({ success: true, newQuantity: updateRes.rows[0].quantity });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Adjust Stock Error:", err);
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
};
