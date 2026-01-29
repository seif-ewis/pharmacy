
import db from "../config/dataBase.js";

/**
 * Log an audit event.
 * @param {string} action - 'ORDER_EDIT', 'PRICE_CHANGE', 'PRESCRIPTION_CONFIRM', 'SHIFT_CLOSE', etc.
 * @param {string} entityId - UUID of the entity (Order ID, Medicine ID, Shift ID).
 * @param {string} entity - 'orders', 'medicines', 'prescriptions', 'shifts'.
 * @param {string} userId - UUID of the user/admin performing the action.
 * @param {Object} details - (Optional) Not stored, for backwards compat only.
 */
export const logEvent = async (action, entityId, entity, userId, details = null) => {
    try {
        await db.query(
            `INSERT INTO audit_logs (action, entity_id, entity, user_id, timestamp)
             VALUES ($1, $2, $3, $4, NOW())`,
            [action, entityId, entity, userId]
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
            SELECT al.*, u.full_name as user_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.timestamp DESC
            LIMIT $1
        `, [limit]);
        return result.rows;
    } catch (err) {
        console.error("Audit Get Logs Error:", err);
        return [];
    }
};
