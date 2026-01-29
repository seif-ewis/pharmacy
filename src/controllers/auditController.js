
import db from "../config/dataBase.js";

/**
 * Log an audit event.
 * @param {string} actionType - 'ORDER_EDIT', 'PRICE_CHANGE', 'PRESCRIPTION_CONFIRM', 'SHIFT_CLOSE', etc.
 * @param {string} entityId - UUID of the entity (Order ID, Medicine ID, Shift ID).
 * @param {string} entityType - 'orders', 'medicines', 'prescriptions', 'shifts'.
 * @param {string} performedBy - UUID of the user/admin.
 * @param {Object} details - JSON object with additional info (e.g., old/new values).
 */
export const logEvent = async (actionType, entityId, entityType, performedBy, details) => {
    try {
        await db.query(
            `INSERT INTO audit_logs (action_type, entity_id, entity_type, performed_by, details, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [actionType, entityId, entityType, performedBy, details]
        );
    } catch (err) {
        console.error("Audit Logger Error:", err);
    }
};

/**
 * Get audit logs for Admin Dashboard.
 */
export const getLogs = async (limit = 100) => {
    try {
        const result = await db.query(`
            SELECT al.*, u.full_name as user_name, u.role as user_role
            FROM audit_logs al
            JOIN users u ON al.performed_by = u.id
            ORDER BY al.created_at DESC
            LIMIT $1
        `, [limit]);
        return result.rows;
    } catch (err) {
        console.error("Audit Get Logs Error:", err);
        return [];
    }
};
