import db from "../config/dataBase.js";

/**
 * Handle user submitting a product request
 */
export const submitRequest = async (req, res) => {
    const { productName, description } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!productName) {
        return res.status(400).json({ success: false, message: "Product name is required" });
    }

    try {
        const result = await db.query(
            "INSERT INTO product_requests (user_id, product_name, description, status) VALUES ($1, $2, $3, 'pending') RETURNING id",
            [userId, productName, description]
        );

        // TODO: Emit socket notification to doctors/admins if applicable
        // if (global.io) { global.io.emit('new_product_request', { id: result.rows[0].id, name: productName }); }

        res.json({ success: true, message: "Request submitted successfully!", id: result.rows[0].id });
    } catch (err) {
        console.error("Submit Request Error:", err);
        res.status(500).json({ success: false, message: "Failed to submit request" });
    }
};

/**
 * Handle user confirming a 'ready' request to turn it into an order
 */
export const confirmReadyRequest = async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user.id;

    try {
        // 1. Get the request and matched medicine
        let reqQuery = "SELECT * FROM product_requests WHERE id = $1 AND status = 'ready'";
        let params = [requestId];

        if (req.user.role !== 'admin' && req.user.role !== 'pharmacist') {
            reqQuery += " AND user_id = $2";
            params.push(userId);
        }

        const reqResult = await db.query(reqQuery, params);

        if (reqResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Request not found or not ready" });
        }

        const request = reqResult.rows[0];
        const medicineId = request.matched_medicine_id;

        // 2. Fetch medicine details
        const medResult = await db.query("SELECT * FROM medicines WHERE id = $1", [medicineId]);
        const medicine = medResult.rows[0];

        // 3. Create a real Order
        // Note: For simplicity, we might redirect to a pre-filled checkout or auto-create a pending order
        // The user says "user click ready to take to make it as an order"
        // We'll create a pending order now.

        const orderUid = 'REQ-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        const orderInsert = await db.query(
            `INSERT INTO orders (order_uid, user_id, status, total_price, subtotal, delivery_fee) 
             VALUES ($1, $2, 'pending', $3, $3, 0) RETURNING id`,
            [orderUid, userId, medicine.price]
        );
        const orderId = orderInsert.rows[0].id;

        await db.query(
            "INSERT INTO order_items (order_id, medicine_id, quantity, price) VALUES ($1, $2, 1, $3)",
            [orderId, medicineId, medicine.price]
        );

        // 4. Update request status
        await db.query("UPDATE product_requests SET status = 'ordered' WHERE id = $1", [requestId]);

        res.json({ success: true, message: "Order created successfully!", orderId: orderId });
    } catch (err) {
        console.error("Confirm Request Error:", err);
        res.status(500).json({ success: false, message: "Failed to create order from request" });
    }
};

/**
 * Doctor/Admin: Update request status
 */
export const updateRequestStatus = async (req, res) => {
    const { requestId } = req.params;
    const { status, matched_medicine_id, doctor_notes } = req.body;

    if (req.user.role !== 'pharmacist' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Forbidden" });
    }

    try {
        await db.query(
            `UPDATE product_requests 
             SET status = $1, matched_medicine_id = $2, doctor_notes = $3 
             WHERE id = $4`,
            [status, matched_medicine_id, doctor_notes, requestId]
        );

        res.json({ success: true, message: "Status updated" });
    } catch (err) {
        console.error("Update Request Status Error:", err);
        res.status(500).json({ success: false, message: "Update failed" });
    }
};

/**
 * User: Get their own requests
 */
export const getUserRequests = async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM product_requests WHERE user_id = $1 ORDER BY created_at DESC",
            [req.user.id]
        );
        res.json({ success: true, requests: result.rows });
    } catch (err) {
        console.error("Get User Requests Error:", err);
        res.status(500).json({ success: false });
    }
};

/**
 * Admin: Get all requests for the dashboard
 */
export const getAdminRequests = async (req, res) => {
    if (req.user.role !== 'pharmacist' && req.user.role !== 'admin') {
        return res.status(403).render("403");
    }

    try {
        const result = await db.query(
            `SELECT pr.*, u.full_name as user_name, u.email as user_email 
             FROM product_requests pr 
             JOIN users u ON u.id = pr.user_id 
             ORDER BY pr.created_at DESC`
        );
        res.render("admin/product_requests", { requests: result.rows, user: req.user, pageTitle: "Product Requests" });
    } catch (err) {
        console.error("Get Admin Requests Error:", err);
        res.status(500).render("500");
    }
};
