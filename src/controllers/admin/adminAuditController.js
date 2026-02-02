import db from "../../config/dataBase.js";

// GET: System Audit Logs (Append-Only)
export const getAuditLogs = async (req, res) => {
    try {
        const { search, entity, startDate, endDate, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT al.*, u.full_name as actor_name, u.role as actor_role
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (al.action ILIKE $${params.length} OR al.entity_id::text ILIKE $${params.length})`;
        }

        if (entity && entity !== 'all') {
            params.push(entity);
            query += ` AND al.entity = $${params.length}`;
        }

        if (startDate) {
            params.push(startDate);
            query += ` AND al.timestamp >= $${params.length}`;
        }

        if (endDate) {
            params.push(endDate);
            query += ` AND al.timestamp <= $${params.length}`;
        }

        query += ` ORDER BY al.timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        const totalCountRes = await db.query("SELECT COUNT(*) FROM audit_logs");

        res.json({
            success: true,
            logs: result.rows,
            totalCount: parseInt(totalCountRes.rows[0].count),
            currentPage: parseInt(page),
            totalPages: Math.ceil(parseInt(totalCountRes.rows[0].count) / limit)
        });
    } catch (err) {
        console.error("Get Audit Logs Error:", err);
        res.status(500).json({ success: false });
    }
};
// GET: Single Audit Entry Details
export const getAuditDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT al.*, u.full_name as actor_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.id = $1
        `, [id]);

        if (result.rows.length === 0) return res.status(404).json({ success: false });
        res.json({ success: true, log: result.rows[0] });
    } catch (err) {
        console.error("Get Audit Details Error:", err);
        res.status(500).json({ success: false });
    }
};
