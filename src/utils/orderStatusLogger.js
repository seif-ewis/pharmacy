import db from '../config/dataBase.js';

/**
 * Log Order Status Change
 * 
 * Creates an immutable audit trail entry whenever an order status changes.
 * This is critical for compliance, dispute resolution, and proving no tampering.
 * 
 * @param {string} orderId - UUID of the order
 * @param {string|null} oldStatus - Previous status (null for new orders)
 * @param {string} newStatus - New status being set
 * @param {string} changedBy - UUID of user making the change
 * @param {object} client - Optional database client (for transactions)
 * @returns {Promise<void>}
 */
export async function logOrderStatusChange(orderId, oldStatus, newStatus, changedBy, client = db) {
    try {
        await client.query(
            `INSERT INTO order_status_logs (order_id, old_status, new_status, changed_by) 
             VALUES ($1, $2, $3, $4)`,
            [orderId, oldStatus, newStatus, changedBy]
        );

        console.log(`📝 Status Log: Order ${orderId}: ${oldStatus || 'NEW'} → ${newStatus} (by ${changedBy})`);
    } catch (err) {
        console.error('❌ Failed to log order status change:', err);
        // Don't throw - logging failure shouldn't block the main operation
        // But log it for monitoring
    }
}

/**
 * Get Order Status History
 * 
 * Retrieves the complete audit trail for an order
 * 
 * @param {string} orderId - UUID of the order
 * @returns {Promise<Array>} Array of status change records
 */
export async function getOrderStatusHistory(orderId) {
    const result = await db.query(
        `SELECT 
            osl.id,
            osl.old_status,
            osl.new_status,
            osl.changed_at,
            u.full_name as changed_by_name,
            u.role as changed_by_role
         FROM order_status_logs osl
         JOIN users u ON osl.changed_by = u.id
         WHERE osl.order_id = $1
         ORDER BY osl.changed_at ASC`,
        [orderId]
    );

    return result.rows;
}
