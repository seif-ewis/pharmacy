import db from "../config/dataBase.js";
import { notifyUsersOfStock } from "./notificationController.js";

/**
 * Log an inventory adjustment - Stock is computed from VIEW, not direct updates.
 * 
 * @param {Object} client - The DB client (for transaction support)
 * @param {string} medicineId - UUID of the medicine
 * @param {string} type - 'initial_stock', 'restock', 'sale', 'return_restock', 'return_discard', 'damage', 'expired', 'manual_adjustment', 'migration_initial_stock'
 * @param {number} quantityChange - Positive or negative integer
 * @param {string | null} referenceId - UUID of Order or Return
 * @param {string} performedBy - UUID of User/Admin
 * @param {string} reason - Description
 * @param {string | null} shiftId - UUID of the shift (NULL for non-shift adjustments like migrations)
 */
export const logAdjustment = async (client, medicineId, type, quantityChange, referenceId, performedBy, reason, shiftId = null) => {
    // CRITICAL: Validate shift if provided
    if (shiftId !== null) {
        const shiftCheck = await client.query(`
            SELECT status, opened_by 
            FROM shifts 
            WHERE id = $1
        `, [shiftId]);

        if (shiftCheck.rows.length === 0) {
            throw new Error(`Invalid shift ID: ${shiftId}`);
        }

        const shift = shiftCheck.rows[0];

        // CRITICAL: Shift must be open
        if (shift.status !== 'open') {
            throw new Error(`Cannot log adjustment to ${shift.status} shift. Only open shifts allowed.`);
        }

        // CRITICAL: Shift must belong to performer UNLESS it's a sale (handled by system/customer)
        // Relaxed rule: If type is 'sale', we allow the adjustment even if (shift.opened_by !== performedBy)
        if (shift.opened_by !== performedBy && type !== 'sale') {
            throw new Error(`Cannot log adjustment to another user's shift (Type: ${type}). Only shift owner can perform manual adjustments.`);
        }
    }

    // Get stock before adjustment
    const beforeStock = await client.query(
        'SELECT current_stock FROM medicine_stock WHERE id = $1',
        [medicineId]
    );

    const oldStock = beforeStock.rows[0]?.current_stock || 0;

    // Insert adjustment record - this is now the ONLY way stock changes
    await client.query(
        `INSERT INTO inventory_adjustments 
        (medicine_id, adjustment_type, quantity_change, reference_id, performed_by, reason, shift_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [medicineId, type, quantityChange, referenceId, performedBy, reason, shiftId]
    );

    // Check new stock for notifications
    const newStock = oldStock + quantityChange;

    // Trigger notification if stocked from 0 to positive
    if (oldStock <= 0 && newStock > 0) {
        // Stock just became available - notify waitlisted users
        notifyUsersOfStock(medicineId);
    }
};

/**
 * Get current stock for a medicine from the computed VIEW
 * 
 * @param {Object} client - DB client
 * @param {string} medicineId - UUID of medicine
 * @returns {Promise<number>} Current stock quantity
 */
export const getStock = async (client, medicineId) => {
    const result = await client.query(
        'SELECT current_stock FROM medicine_stock WHERE id = $1',
        [medicineId]
    );
    return result.rows[0]?.current_stock || 0;
};

/**
 * Get the currently open shift for a user
 * 
 * @param {Object} client - DB client
 * @param {string} userId - UUID of user
 * @returns {Promise<string|null>} Shift ID or null if no open shift
 */
export const getCurrentShift = async (client, userId) => {
    const result = await client.query(`
        SELECT id, opened_at, opened_by
        FROM shifts 
        WHERE opened_by = $1 
        AND status = 'open'
        LIMIT 1
    `, [userId]);

    return result.rows[0]?.id || null;
};

/**
 * Validate shift ownership and status
 * 
 * @param {Object} client - DB client
 * @param {string} shiftId - UUID of shift
 * @param {string} userId - UUID of user
 * @throws Error if shift invalid, closed, or not owned by user
 * @returns {Promise<boolean>} True if valid
 */
export const validateShift = async (client, shiftId, userId) => {
    const result = await client.query(`
        SELECT status, opened_by 
        FROM shifts 
        WHERE id = $1
    `, [shiftId]);

    if (result.rows.length === 0) {
        throw new Error(`Shift not found: ${shiftId}`);
    }

    const shift = result.rows[0];

    if (shift.status !== 'open') {
        throw new Error(`Shift is ${shift.status}, cannot perform operations on closed shifts`);
    }

    if (shift.opened_by !== userId) {
        throw new Error('Shift does not belong to this user');
    }

    return true;
};

