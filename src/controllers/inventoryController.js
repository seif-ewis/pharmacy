import db from "../config/dataBase.js";
import { notifyUsersOfStock } from "./notificationController.js";

/**
 * Log an inventory adjustment and update medicine quantity transactionally.
 * 
 * @param {Object} client - The DB client (for transaction support)
 * @param {string} medicineId - UUID of the medicine
 * @param {string} type - 'restock', 'sale', 'return_restock', 'return_discard', 'damage', 'expired', 'correction', 'audit'
 * @param {number} quantityChange - Positive or negative integer
 * @param {string | null} referenceId - UUID of Order or Return
 * @param {string} performedBy - UUID of User/Admin
 * @param {string} reason - Description
 */
export const logAdjustment = async (client, medicineId, type, quantityChange, referenceId, performedBy, reason) => {
    // 1. Insert into inventory_adjustments
    await client.query(
        `INSERT INTO inventory_adjustments 
        (medicine_id, adjustment_type, quantity_change, reference_id, performed_by, reason) 
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [medicineId, type, quantityChange, referenceId, performedBy, reason]
    );

    // 2. Update medicines stock
    // Only update stock if it affects available inventory
    // 'return_discard', 'damage', 'expired' usually mean stock was lost or moved to non-sellable, 
    // BUT if the type is 'sale' (negative) we subtract.

    // Logic:
    // - 'restock', 'return_restock': INCREASE stock (quantityChange > 0)
    // - 'sale', 'correction' (negative): DECREASE stock (quantityChange < 0)
    // - 'return_discard', 'damage', 'expired': These explain why stock is gone/bad.
    //   If we are "discarding" a return that was never re-added, we don't change stock (it was already "sold").
    //   If we are finding damaged goods on shelf, we decrease stock.

    // For simplicity in this system:
    // We assume quantityChange is the direct delta to apply to the 'quantity' column.
    // EXCEPT for 'return_discard'. If a return is discarded, it means it comes back from user but goes to trash.
    // It does NOT go back to 'medicines.quantity'.
    // So 'return_discard' should theoretically have quantityChange = 0 for the main stock, 
    // OR we log it as 0 change but strictly for audit.

    // DECISION: 
    // - If type is 'return_discard', we do NOT update main stock (it remains sold/out).
    // - All other types apply the delta.

    if (type !== 'return_discard') {
        const updateResult = await client.query(
            "UPDATE medicines SET quantity = quantity + $1 WHERE id = $2 RETURNING quantity",
            [quantityChange, medicineId]
        );

        const newQuantity = updateResult.rows[0].quantity;
        const oldQuantity = newQuantity - quantityChange;

        // Trigger notification if stocked from 0
        if (oldQuantity <= 0 && newQuantity > 0) {
            // We use a non-blocking calling or ensure it happens after commit?
            // Actually, notificationController uses 'db.query' which is the global pool.
            // If the adjustment is in a transaction, we should ideally wait for commit.
            // But since this is a manual design, calling it here is a good start.
            notifyUsersOfStock(medicineId);
        }
    }
};
