import db from "../config/dataBase.js";
import * as inventoryController from "./inventoryController.js";

// Page: Request Return (User)
export const getReturnPage = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const result = await db.query(
            `SELECT o.*, 
                    json_agg(json_build_object('id', m.id, 'name', m.name, 'price', oi.price, 'qty', oi.quantity)) as items
             FROM orders o
             JOIN order_items oi ON o.id = oi.order_id
             JOIN medicines m ON oi.medicine_id = m.id
             WHERE o.id = $1 AND o.user_id = $2 AND (o.status = 'completed' OR o.status = 'delivered')
             GROUP BY o.id`,
            [orderId, req.user.id]
        );

        if (result.rows.length === 0) {
            req.flash("error", "Order not found or not eligible for return.");
            return res.redirect("/profile");
        }

        res.render("orders/return_request", {
            order: result.rows[0],
            error: req.flash("error"),
            success: req.flash("success")
        });

    } catch (err) {
        console.error("Get Return Page Error:", err);
        res.redirect("/profile");
    }
};

// Action: Submit Return Request (User)
export const submitReturnRequest = async (req, res) => {
    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const { order_id, reason } = req.body;

        // 1. Fetch Ordered Quantities and Previously Returned Quantities
        // We need to lock the rows to prevent race conditions ideally, but for now a check is sufficient.
        // 1. Fetch Ordered Quantities, Price, and Previously Returned Quantities
        const orderItemsRes = await client.query(`
            SELECT 
                oi.medicine_id, 
                oi.quantity as ordered_qty,
                oi.price as unit_price,
                COALESCE(SUM(ri.quantity), 0) as returned_qty
            FROM order_items oi
            LEFT JOIN returns r ON r.order_id = oi.order_id AND r.status != 'rejected'
            LEFT JOIN return_items ri ON ri.return_id = r.id AND ri.medicine_id = oi.medicine_id
            WHERE oi.order_id = $1
            GROUP BY oi.medicine_id, oi.quantity, oi.price
        `, [order_id]);

        const orderState = {};
        orderItemsRes.rows.forEach(row => {
            orderState[row.medicine_id] = {
                ordered: parseInt(row.ordered_qty),
                returned: parseInt(row.returned_qty),
                price: parseFloat(row.unit_price) // Ensure price is available
            };
        });

        const medicineIds = Object.keys(req.body).filter(k => k.startsWith('qty_')).map(k => k.replace('qty_', ''));
        const itemsToReturn = [];
        let totalRefund = 0;

        // 2. Validate Request & Calculate Refund
        let hasItems = false;
        for (const medId of medicineIds) {
            const qty = parseInt(req.body[`qty_${medId}`]);
            if (qty > 0) {
                if (!orderState[medId]) {
                    throw new Error(`Item ${medId} does not belong to this order.`);
                }
                const remaining = orderState[medId].ordered - orderState[medId].returned;
                if (qty > remaining) {
                    throw new Error(`Cannot return ${qty} items. Only ${remaining} eligible for return.`);
                }

                // Calculate refund for this item
                const itemRefund = qty * orderState[medId].price;
                totalRefund += itemRefund;

                itemsToReturn.push({ medId, qty });
                hasItems = true;
            }
        }

        if (!hasItems) {
            throw new Error("No items selected for return.");
        }

        // 3. Create Return Record
        const returnRes = await client.query(
            `INSERT INTO returns (order_id, user_id, status, reason, refund_amount) 
             VALUES ($1, $2, 'pending', $3, $4) RETURNING id`,
            [order_id, req.user.id, reason, totalRefund]
        );
        const returnId = returnRes.rows[0].id;

        // 4. Insert Return Items
        for (const item of itemsToReturn) {
            await client.query(
                `INSERT INTO return_items (return_id, medicine_id, quantity, condition) 
                 VALUES ($1, $2, $3, 'good')`,
                [returnId, item.medId, item.qty]
            );
        }

        await client.query("COMMIT");
        req.flash("success", "Return request submitted successfully. We will review it shortly.");
        res.redirect("/profile");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Submit Return Error:", err);
        req.flash("error", err.message || "Failed to submit return request.");
        res.redirect("/profile"); // Provide specific ID if possible, or fallback
    } finally {
        client.release();
    }
};

// Admin: Process Return (Approve/Reject)
export const processReturn = async (req, res) => {
    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const { return_id, action, admin_notes, item_conditions } = req.body;
        const doctorId = req.user.id;

        if (action === 'reject') {
            await client.query(
                "UPDATE returns SET status = 'rejected', admin_notes = $1, updated_at = NOW() WHERE id = $2",
                [admin_notes, return_id]
            );
        } else {
            // Approve Flow
            // 1. Get Active Shift for the Admin
            const shiftRes = await client.query(
                "SELECT id FROM shifts WHERE opened_by = $1 AND status = 'open' LIMIT 1",
                [doctorId]
            );
            const activeShiftId = shiftRes.rows.length > 0 ? shiftRes.rows[0].id : null;

            // 2. Update Return Status, Link to Shift & Notes
            await client.query(
                "UPDATE returns SET status = 'approved', admin_notes = $1, shift_id = $2, updated_at = NOW() WHERE id = $3",
                [admin_notes, activeShiftId, return_id]
            );

            // 3. Check for Full vs Partial Return
            // We get the order_id first
            const orderRes = await client.query("SELECT order_id FROM returns WHERE id = $1", [return_id]);
            const orderId = orderRes.rows[0].order_id;

            const qtyCheck = await client.query(`
                SELECT 
                    (SELECT SUM(quantity) FROM order_items WHERE order_id = $1) as total_ordered,
                    (SELECT SUM(ri.quantity) 
                     FROM return_items ri 
                     JOIN returns r ON ri.return_id = r.id 
                     WHERE r.order_id = $1 AND r.status = 'approved') as total_returned
            `, [orderId]);

            const { total_ordered, total_returned } = qtyCheck.rows[0];

            // If ALL items are returned, set status to 'returned'. 
            // Otherwise, keep it as is (likely 'delivered' or 'completed').
            if (parseInt(total_returned || 0) >= parseInt(total_ordered || 0)) {
                await client.query(
                    "UPDATE orders SET status = 'returned' WHERE id = $1",
                    [orderId]
                );
            }

            // 4. Fetch Return Items
            const itemsRes = await client.query("SELECT * FROM return_items WHERE return_id = $1", [return_id]);
            const returnItems = itemsRes.rows;

            // 5. Process Inventory Logic per item
            for (const item of returnItems) {
                const condition = item_conditions && item_conditions[item.id] ? item_conditions[item.id] : 'good';

                let adjustmentType = 'return_restock'; // Default: Good, put back on shelf
                let qtyChange = item.quantity; // Positive (add back)

                if (condition === 'damaged' || condition === 'expired') {
                    adjustmentType = 'return_discard';
                    qtyChange = 0; // Do NOT add back to stock
                }

                // Update Item Condition in DB
                await client.query(
                    "UPDATE return_items SET condition = $1 WHERE id = $2",
                    [condition, item.id]
                );

                // Log Inventory Adjustment
                await inventoryController.logAdjustment(
                    client,
                    item.medicine_id,
                    adjustmentType,
                    qtyChange,
                    return_id,
                    req.user.id,
                    `Return Approved: ${condition}`
                );
            }
        }

        await client.query("COMMIT");
        req.flash("success", `Return request ${action}ed.`);
        res.redirect("/admin/returns");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Process Return Error:", err);
        req.flash("error", "Failed to process return.");
        res.redirect("/admin/returns");
    } finally {
        client.release();
    }
};

// Admin: View Returns Dashboard
export const getAdminReturns = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT r.*, 
                   u.email as user_email, 
                   o.order_uid,
                   json_agg(json_build_object(
                       'id', ri.id, 
                       'medicine_id', ri.medicine_id, 
                       'quantity', ri.quantity, 
                       'medicine_name', m.name
                   )) as items
            FROM returns r
            JOIN users u ON r.user_id = u.id
            JOIN orders o ON r.order_id = o.id
            JOIN return_items ri ON r.id = ri.return_id
            JOIN medicines m ON ri.medicine_id = m.id
            WHERE r.status = 'pending'
            GROUP BY r.id, u.email, o.order_uid, o.id
            ORDER BY r.created_at ASC
        `);

        res.render("admin/returns", {
            pendingReturns: result.rows,
            error: req.flash("error"),
            success: req.flash("success")
        });

    } catch (err) {
        console.error("Admin Returns Page Error:", err);
        res.redirect("/");
    }
};

// API: Get Pending Returns for Doctor Dashboard
export const getPendingReturns = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT r.*, 
                   u.full_name as user_name,
                   o.order_uid,
                   o.total_price as order_total,
                   json_agg(json_build_object(
                       'id', ri.id, 
                       'medicine_id', ri.medicine_id, 
                       'quantity', ri.quantity, 
                       'medicine_name', m.name,
                       'price', ri.quantity * m.price 
                   )) as items
            FROM returns r
            JOIN users u ON r.user_id = u.id
            JOIN orders o ON r.order_id = o.id
            JOIN return_items ri ON r.id = ri.return_id
            JOIN medicines m ON ri.medicine_id = m.id
            WHERE r.status = 'pending'
            GROUP BY r.id, u.full_name, o.order_uid, o.total_price
            ORDER BY r.created_at ASC
        `);

        res.json({
            success: true,
            returns: result.rows
        });

    } catch (err) {
        console.error("Get Pending Returns Error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch returns" });
    }
};
