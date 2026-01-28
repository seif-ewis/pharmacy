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

        const { order_id, reason, selected_items } = req.body;
        // selected_items expected format: { medicine_id: quantity, ... } or simplified for MVP

        // For MVP, assuming returning ALL selected items with quantity provided in form
        // Let's parse the form data. Expecting arrays if multiple items.

        // Create Return Record
        const returnRes = await client.query(
            `INSERT INTO returns (order_id, user_id, status, reason, refund_amount) 
             VALUES ($1, $2, 'pending', $3, 0) RETURNING id`,
            [order_id, req.user.id, reason]
        );
        const returnId = returnRes.rows[0].id;

        // Insert Return Items
        const items = Array.isArray(req.body.items) ? req.body.items : [req.body.items];
        // items is array of { medicine_id, quantity }

        // Note: In a real form, this parsing might be more complex depending on how HTML sends it.
        // We'll assume a simplified payload for now or handle the req.body structure in the view.

        // Temporary simplistic handling for the view we will build:
        // We will likely loop through keys in body like `qty_${medicineId}`

        let hasItems = false;
        const medicineIds = Object.keys(req.body).filter(k => k.startsWith('qty_')).map(k => k.replace('qty_', ''));

        for (const medId of medicineIds) {
            const qty = parseInt(req.body[`qty_${medId}`]);
            if (qty > 0) {
                hasItems = true;
                await client.query(
                    `INSERT INTO return_items (return_id, medicine_id, quantity, condition) 
                     VALUES ($1, $2, $3, 'good')`, // Default to good, admin verifies later
                    [returnId, medId, qty]
                );
            }
        }

        if (!hasItems) {
            throw new Error("No items selected for return.");
        }

        await client.query("COMMIT");
        req.flash("success", "Return request submitted successfully. We will review it shortly.");
        res.redirect("/profile");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Submit Return Error:", err);
        req.flash("error", err.message || "Failed to submit return request.");
        res.redirect("/profile");
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
        // action: 'approve' or 'reject'
        // item_conditions: { return_item_id: 'good' | 'damaged' }

        if (action === 'reject') {
            await client.query(
                "UPDATE returns SET status = 'rejected', admin_notes = $1, updated_at = NOW() WHERE id = $2",
                [admin_notes, return_id]
            );
        } else {
            // Approve Flow
            // 1. Update Return Status
            await client.query(
                "UPDATE returns SET status = 'approved', admin_notes = $1, updated_at = NOW() WHERE id = $2",
                [admin_notes, return_id]
            );

            // 2. Fetch Return Items
            const itemsRes = await client.query("SELECT * FROM return_items WHERE return_id = $1", [return_id]);
            const returnItems = itemsRes.rows;

            // 3. Process Inventory Logic per item
            for (const item of returnItems) {
                // Determine condition from admin input or default
                // In a detailed UI, admin sets condition per item.
                // For MVP, if we don't have per-item granular input, assume form sends it or defaults.

                const condition = item_conditions && item_conditions[item.id] ? item_conditions[item.id] : 'good';

                let adjustmentType = 'return_restock'; // Default: Good, put back on shelf
                let qtyChange = item.quantity; // Positive (add back)

                if (condition === 'damaged' || condition === 'expired') {
                    adjustmentType = 'return_discard';
                    qtyChange = 0; // Do NOT add back to stock (see inventoryController logic)
                    // We still log the event though
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
