import db from "../config/dataBase.js";
import { logOrderStatusChange } from "../utils/orderStatusLogger.js";
import * as inventoryController from "./inventoryController.js";

// Render Checkout Page
export const getCheckoutPage = async (req, res) => {
    const client = await db.connect();
    try {
        const addressRes = await client.query(
            "SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, id ASC",
            [req.user.id]
        );

        // Fetch Settings
        const settingsRes = await client.query("SELECT delivery_fee FROM pharmacy_settings ORDER BY created_at DESC LIMIT 1");
        const deliveryFee = settingsRes.rows.length > 0 ? parseFloat(settingsRes.rows[0].delivery_fee) : 0.00;

        res.render("checkout", {
            user: req.user,
            addresses: addressRes.rows,
            deliveryFee: deliveryFee,
            pageTitle: "Checkout"
        });
    } catch (err) {
        console.error("Get Checkout Page Error:", err);
        req.flash("error", "Failed to load checkout page.");
        res.redirect("/profile");
    } finally {
        client.release();
    }
};

// Get User's Orders
// Get User's Orders (Paginated)
export const getOrders = async (req, res) => {
    const client = await db.connect();
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        // Count total orders
        const countRes = await client.query(
            "SELECT COUNT(*) FROM orders WHERE user_id = $1",
            [req.user.id]
        );
        const totalOrders = parseInt(countRes.rows[0].count);
        const totalPages = Math.ceil(totalOrders / limit);

        // Fetch paginated orders
        const result = await client.query(`
            SELECT 
                o.*,
                json_agg(
                    json_build_object(
                        'name', m.name,
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'image_url', m.image_url,
                        'medicine_id', m.id,
                        'returned_quantity', (
                            SELECT COALESCE(SUM(ri.quantity), 0)
                            FROM return_items ri
                            JOIN returns r ON ri.return_id = r.id
                            WHERE ri.medicine_id = m.id AND r.order_id = o.id AND r.status = 'approved'
                        )
                    )
                ) as items
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN medicines m ON oi.medicine_id = m.id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT $2 OFFSET $3
        `, [req.user.id, limit, offset]);

        // Fetch product requests
        const requestsRes = await client.query(
            "SELECT * FROM product_requests WHERE user_id = $1 ORDER BY created_at DESC",
            [req.user.id]
        );

        res.render("orders/index", {
            user: req.user,
            orders: result.rows,
            requests: requestsRes.rows,
            pagination: {
                current: page,
                pages: totalPages,
                total: totalOrders
            },
            pageTitle: "My Orders"
        });
    } catch (err) {
        console.error("Get Orders Error:", err);
        req.flash("error", "Failed to fetch orders.");
        res.redirect("/profile");
    } finally {
        client.release();
    }
};

// Calculate Order Total (Backend)
export const calculateOrder = async (req, res) => {
    const { items, couponCode } = req.body;
    // items: [{ medicine_id, quantity }]

    if (!items || items.length === 0) {
        return res.json({ success: true, subtotal: 0, tax: 0, delivery: 0, total: 0, discount: 0 });
    }

    const client = await db.connect();
    try {
        let subtotal = 0;
        const validItems = [];

        // 1. Validate Items & Prices
        for (const item of items) {
            const medRes = await client.query("SELECT id, price, name FROM medicines WHERE id = $1", [item.medicine_id]);
            if (medRes.rows.length > 0) {
                const med = medRes.rows[0];
                const lineTotal = parseFloat(med.price) * item.quantity;
                subtotal += lineTotal;
                validItems.push({ ...med, quantity: item.quantity, lineTotal });
            }
        }

        // Fetch Settings (Latest)
        const settingsRes = await client.query("SELECT tax_rate, delivery_fee FROM pharmacy_settings ORDER BY created_at DESC LIMIT 1");
        const settings = settingsRes.rows[0] || { tax_rate: 0.10, delivery_fee: 5.00 };

        const deliveryFee = parseFloat(settings.delivery_fee);
        // Force Tax to 0 as per user request
        const taxRate = 0; // parseFloat(settings.tax_rate);
        let discountAmount = 0;
        let couponId = null;
        let couponLabel = null;

        // 2. Apply Coupon
        if (couponCode) {
            const promoRes = await client.query(
                "SELECT * FROM promotions WHERE code = $1 AND is_active = true AND start_date <= NOW() AND end_date >= NOW()",
                [couponCode.toUpperCase()]
            );

            if (promoRes.rows.length > 0) {
                const promo = promoRes.rows[0];
                let isValid = true;

                // Check constraints
                if (promo.min_order_amount && subtotal < parseFloat(promo.min_order_amount)) isValid = false;

                // Check usage limits
                if (isValid && req.user) {
                    const usageRes = await client.query(
                        "SELECT COUNT(*) FROM promotion_usage WHERE promotion_id = $1 AND user_id = $2",
                        [promo.id, req.user.id]
                    );
                    const usageCount = parseInt(usageRes.rows[0].count);

                    if (promo.usage_limit_per_user && usageCount >= promo.usage_limit_per_user) {
                        isValid = false;
                    }

                    // Global Usage Limit Check
                    if (isValid && promo.usage_limit_global) {
                        const globalUsageRes = await client.query(
                            "SELECT COUNT(*) FROM promotion_usage WHERE promotion_id = $1",
                            [promo.id]
                        );
                        const globalCount = parseInt(globalUsageRes.rows[0].count);
                        if (globalCount >= promo.usage_limit_global) {
                            isValid = false;
                        }
                    }
                }

                if (isValid) {
                    couponId = promo.id;
                    couponLabel = promo.label;
                    if (promo.discount_type === 'percentage') {
                        discountAmount = subtotal * (parseFloat(promo.discount_value) / 100);
                        if (promo.max_discount_amount && discountAmount > parseFloat(promo.max_discount_amount)) {
                            discountAmount = parseFloat(promo.max_discount_amount);
                        }
                    } else {
                        discountAmount = parseFloat(promo.discount_value);
                    }
                }
            }
        }

        const tax = (subtotal - discountAmount) * taxRate;
        const total = (subtotal - discountAmount) + tax + deliveryFee;

        // Ensure no negative total
        const finalTotal = Math.max(0, total);

        res.json({
            success: true,
            subtotal: subtotal.toFixed(2),
            discount: discountAmount.toFixed(2),
            tax: tax.toFixed(2),
            delivery: deliveryFee.toFixed(2),
            total: finalTotal.toFixed(2),
            couponApplied: couponId ? true : false,
            couponLabel: couponLabel
        });

    } catch (err) {
        console.error("Calculate Order Error:", err);
        res.status(500).json({ success: false, error: "Calculation failed" });
    } finally {
        client.release();
    }
};

// Create Order (Checkout)
export const createOrder = async (req, res) => {
    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const { address_id, items, payment_method } = req.body;
        // items: [{ medicine_id, quantity, price }]

        let subtotal = 0;
        const validItems = [];

        // 1. Validate Items & Stock
        for (const item of items) {
            const medRes = await client.query(`
                SELECT 
                    m.*,
                    COALESCE(ms.current_stock, 0) as current_stock
                FROM medicines m
                LEFT JOIN medicine_stock ms ON ms.id = m.id
                WHERE m.id = $1
            `, [item.medicine_id]);

            if (medRes.rows.length === 0) throw new Error(`Medicine ${item.medicine_id} not found`);

            const med = medRes.rows[0];
            if (med.current_stock < item.quantity) {
                throw new Error(`Insufficient stock for ${med.name}`);
            }

            subtotal += parseFloat(med.price) * item.quantity;
            validItems.push({ ...item, price: med.price });
        }

        // Fetch Settings (Latest)
        const settingsRes = await client.query("SELECT tax_rate, delivery_fee FROM pharmacy_settings ORDER BY created_at DESC LIMIT 1");
        const settings = settingsRes.rows[0] || { tax_rate: 0.10, delivery_fee: 5.00 };

        const deliveryFee = parseFloat(settings.delivery_fee);
        const taxRate = parseFloat(settings.tax_rate);

        // Recalculate Totals (to verify frontend data)
        // ... (existing logic) ...

        // 1.5. Apply Coupon logic again to be secure
        let discountAmount = 0;
        let promotionId = null;

        // Note: For a real app, pass couponCode in body. For this fix, we assume simplified flow or add it.
        // If frontend passes 'couponCode', we use it. If not, no discount.
        if (req.body.couponCode) {
            const promoRes = await client.query(
                "SELECT * FROM promotions WHERE code = $1 AND is_active = true AND start_date <= NOW() AND end_date >= NOW()",
                [req.body.couponCode.toUpperCase()]
            );
            if (promoRes.rows.length > 0) {
                const promo = promoRes.rows[0];
                const usageRes = await client.query("SELECT COUNT(*) FROM promotion_usage WHERE promotion_id = $1 AND user_id = $2", [promo.id, req.user.id]);
                const usageCount = parseInt(usageRes.rows[0].count);

                let isValid = true;
                if (promo.usage_limit_per_user && usageCount >= promo.usage_limit_per_user) isValid = false;

                // Dynamic Global Limit Check
                if (isValid && promo.usage_limit_global) {
                    const globalUsageRes = await client.query("SELECT COUNT(*) FROM promotion_usage WHERE promotion_id = $1", [promo.id]);
                    const globalCount = parseInt(globalUsageRes.rows[0].count);
                    if (globalCount >= promo.usage_limit_global) isValid = false;
                }

                if (isValid) {
                    promotionId = promo.id;
                    if (promo.discount_type === 'percentage') {
                        discountAmount = subtotal * (parseFloat(promo.discount_value) / 100);
                        if (promo.max_discount_amount && discountAmount > parseFloat(promo.max_discount_amount)) discountAmount = parseFloat(promo.max_discount_amount);
                    } else {
                        discountAmount = parseFloat(promo.discount_value);
                    }
                }
            }
        }

        const tax = (subtotal - discountAmount) * taxRate;
        const total = (subtotal - discountAmount) + deliveryFee + tax;
        const finalTotal = Math.max(0, total);

        // 1.7 Check Pharmacy Status for Order Status
        const pharmacyStatusRes = await client.query("SELECT is_open FROM pharmacy_status_logs ORDER BY created_at DESC LIMIT 1");
        const isPharmacyOpen = pharmacyStatusRes.rows[0]?.is_open ?? true;
        const initialStatus = isPharmacyOpen ? 'pending' : 'scheduled';

        // 1.8 Get Active Shift (if exists) - Optional for creation
        const shiftRes = await client.query("SELECT id FROM shifts WHERE status='open' ORDER BY opened_at DESC LIMIT 1");
        const activeShiftId = shiftRes.rows[0]?.id || null;

        // 2. Create Order Record (with shift_id)
        const orderRes = await client.query(
            `INSERT INTO orders (
                user_id, address_id, status, shift_id, completed_shift_id,
                subtotal, delivery_fee, tax_amount, discount_total, promotion_id, total_price, 
                payment_status, created_at, order_uid
            ) VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, $10, 'paid', NOW(), substr(md5(random()::text), 1, 8)) 
            RETURNING id`,
            [req.user.id, address_id, initialStatus, activeShiftId, subtotal, deliveryFee, tax, discountAmount, promotionId, finalTotal]
        );
        const orderId = orderRes.rows[0].id;

        // 2.1 Log Order Status (Audit Trail)
        await logOrderStatusChange(orderId, null, initialStatus, req.user.id, client);

        // 2.5 Record Promotion Usage
        if (promotionId) {
            await client.query(
                "INSERT INTO promotion_usage (id, promotion_id, user_id, order_id, discount_applied, used_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())",
                [promotionId, req.user.id, orderId, discountAmount]
            );
        }

        // 3. Create Order Items & Update Inventory
        const orderIdStr = String(orderId); // Define here for scope
        for (const item of validItems) {
            // Insert Order Item
            await client.query(
                `INSERT INTO order_items(order_id, medicine_id, quantity, price)
VALUES($1, $2, $3, $4)`,
                [orderId, item.medicine_id, item.quantity, item.price]
            );

            // Log Inventory Adjustment (Sale) with shift tracking
            // Note: quantityChange is NEGATIVE for sales
            // Stock deduction belongs to the shift that COMPLETES the order
            await inventoryController.logAdjustment(
                client,
                item.medicine_id,
                'sale',
                -Math.abs(item.quantity), // Ensure it's negative
                orderIdStr,
                req.user.id,
                `Order Sale #${orderIdStr.substring(0, 8)} `,
                activeShiftId  // Pass the active shift for tracking
            );
        }

        // 4. Create Notification
        const notifTitle = "Order Placed Successfully";
        const notifMessage = `Your order #${orderIdStr.substring(0, 8).toUpperCase()} has been placed and is being processed.`;

        const notifRes = await client.query(
            "INSERT INTO notifications (title, message, type, created_at) VALUES ($1, $2, 'transactional', NOW()) RETURNING id",
            [notifTitle, notifMessage]
        );
        const notifId = notifRes.rows[0].id;

        await client.query(
            "INSERT INTO user_notifications (user_id, notification_id, read, sent_at) VALUES ($1, $2, false, NOW())",
            [req.user.id, notifId]
        );

        await client.query("COMMIT");

        // Response
        if (req.headers.accept.includes('application/json')) {
            res.json({ success: true, order_id: orderId });
        } else {
            req.flash("success", "Order placed successfully!");
            res.redirect(`/ profile`);
        }

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Create Order Error:", err);

        if (req.headers.accept.includes('application/json')) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            req.flash("error", err.message || "Failed to place order.");
            res.redirect("/");
        }
    } finally {
        client.release();
    }
};

// Cancel Order & Restock
export const cancelOrder = async (req, res) => {
    console.log('[OrderController] cancelOrder called for ID:', req.params.id);
    const { id } = req.params;
    const client = await db.connect();
    try {
        await client.query("BEGIN");

        // 1. Fetch Order (Ensure it belongs to user and is pending)
        const orderRes = await client.query(
            "SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND status = 'pending'",
            [id, req.user.id]
        );

        if (orderRes.rows.length === 0) {
            throw new Error("Order not found or cannot be cancelled (must be pending).");
        }
        const order = orderRes.rows[0];

        // 1.5 Guard: Only allow cancellation if order is NOT completed/delivered
        if (order.completed_shift_id) {
            throw new Error("Cannot cancel an order that has already been completed or delivered.");
        }

        // 2. Fetch Order Items for Restocking
        const itemsRes = await client.query("SELECT * FROM order_items WHERE order_id = $1", [id]);
        const items = itemsRes.rows;

        // 3. Update Order Status & Timestamp
        const oldStatus = order.status; // Should be 'pending'
        await client.query("UPDATE orders SET status = 'canceled', canceled_at = NOW() WHERE id = $1", [id]);

        // 3.1 Log Status Change (Audit Trail)
        await logOrderStatusChange(id, oldStatus, 'canceled', req.user.id, client);

        // 3.2 Get Current Shift for Restocking Attribution
        const currentShift = await inventoryController.getCurrentShift(client, req.user.id);

        // 4. Restock Inventory
        for (const item of items) {
            // Fix: Cast orderId to string to prevent crash if it's an integer
            const orderIdStr = String(id);
            await inventoryController.logAdjustment(
                client,
                item.medicine_id,
                'restock', // Type: restock (adds quantity)
                Math.abs(item.quantity), // Positive value to ADD stock
                orderIdStr,
                req.user.id,
                `Order Cancellation #${orderIdStr.substring(0, 8)} `,
                currentShift  // Track which shift performed the restock
            );
        }

        await client.query("COMMIT");
        req.flash("success", "Order cancelled successfully. Items have been restocked.");
        res.redirect("/profile");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Cancel Order Error:", err);
        req.flash("error", err.message || "Failed to cancel order.");
        res.redirect("/profile");
    } finally {
        client.release();
    }
};

// Get Order Details (Invoice View)
export const getOrderDetails = async (req, res) => {
    console.log('[OrderController] getOrderDetails called for ID:', req.params.id);
    const { id } = req.params;
    const client = await db.connect();
    try {
        // Fetch Order with Items, Address, and Medicine Details
        // Fetch Order with Items, Address, and Medicine Details
        const query = `
SELECT
o.*,
    a.label as address_label, a.street, a.city,
    json_agg(
        json_build_object(
            'name', m.name,
            'quantity', oi.quantity,
            'price', oi.price,
            'total', (oi.quantity * oi.price),
            'image_url', m.image_url
        )
    ) as items
            FROM orders o
            LEFT JOIN addresses a ON o.address_id = a.id
            JOIN order_items oi ON o.id = oi.order_id
            JOIN medicines m ON oi.medicine_id = m.id
            WHERE o.id = $1 AND o.user_id = $2
            GROUP BY o.id, a.id, a.label, a.street, a.city
    `;
        const result = await client.query(query, [id, req.user.id]);

        if (result.rows.length === 0) {
            req.flash("error", "Order not found or access denied.");
            return res.redirect("/profile");
        }

        res.render("orders/details", {
            user: req.user,
            order: result.rows[0],
            pageTitle: `Order #${result.rows[0].order_uid || id} `
        });

    } catch (err) {
        console.error("Get Order Details Error:", err);
        req.flash("error", "Error loading order: " + err.message);
        res.redirect("/profile");
    } finally {
        client.release();
    }
};
