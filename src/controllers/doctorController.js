
import db from '../config/dataBase.js';
import * as inventoryController from './inventoryController.js';
import { formatTimeAgo } from '../utils/formatDate.js';
import { logOrderStatusChange } from '../utils/orderStatusLogger.js';

// Get Dashboard
export const getDashboard = async (req, res) => {
    try {
        const doctorId = req.user.id;

        // Check for active shift
        const shiftRes = await db.query(
            "SELECT * FROM shifts WHERE opened_by = $1 AND status = 'open' LIMIT 1",
            [doctorId]
        );
        let activeShift = shiftRes.rows[0] || null;

        // Calculate LIVE Shift Stats (since shift table is only updated on close)
        if (activeShift) {
            // Live Revenue & Orders from Orders Table
            const shiftMetricsRes = await db.query(
                `SELECT 
                    COALESCE(SUM(total_price), 0) as gross_revenue,
                    COUNT(*) as total_orders
                 FROM orders 
                 WHERE shift_id = $1`,
                [activeShift.id]
            );

            // Live Returns
            const shiftReturnsRes = await db.query(
                `SELECT COALESCE(SUM(refund_amount), 0) as total_refunds 
                 FROM returns 
                 WHERE shift_id = $1`,
                [activeShift.id]
            );

            // Live Prescriptions Processed in Shift
            const shiftPresRes = await db.query(
                `SELECT COUNT(*) as count 
                 FROM prescriptions 
                 WHERE shift_id = $1`,
                [activeShift.id]
            );

            const gross = parseFloat(shiftMetricsRes.rows[0].gross_revenue || 0);
            const refunds = parseFloat(shiftReturnsRes.rows[0].total_refunds || 0);

            // Overwrite stale shift data with live data
            activeShift = {
                ...activeShift,
                gross_revenue: (gross - refunds).toFixed(2),
                total_orders: parseInt(shiftMetricsRes.rows[0].total_orders || 0),
                total_prescriptions: parseInt(shiftPresRes.rows[0].count || 0)
            };
        }

        // Fetch prescriptions (Pending)
        const presRes = await db.query(
            "SELECT p.*, u.full_name as user_name FROM prescriptions p JOIN users u ON p.user_id = u.id WHERE p.status = 'reviewing' ORDER BY p.created_at DESC"
        );
        const pendingPrescriptions = presRes.rows.map(p => ({
            ...p,
            timeAgo: formatTimeAgo(p.created_at)
        }));

        // Fetch Scheduled/Pending Orders
        const ordersRes = await db.query(
            "SELECT o.*, u.full_name as user_name FROM orders o JOIN users u ON o.user_id = u.id WHERE o.status IN ('scheduled', 'pending', 'processing') ORDER BY o.created_at ASC"
        );
        const activeOrders = ordersRes.rows;

        // Fetch product requests (Grouped for trending)
        const requestTrendRes = await db.query(`
            SELECT product_name, COUNT(*) as count 
            FROM product_requests 
            GROUP BY product_name 
            ORDER BY count DESC 
            LIMIT 10
        `);
        const trendingRequests = requestTrendRes.rows;

        // Fetch previous shifts (History)
        const historyRes = await db.query(
            "SELECT * FROM shifts WHERE opened_by = $1 AND status = 'closed' ORDER BY opened_at DESC LIMIT 10",
            [doctorId]
        );
        const previousShifts = historyRes.rows;

        // Fetch Status & Settings
        const statusRes = await db.query("SELECT is_open FROM pharmacy_status_logs ORDER BY created_at DESC LIMIT 1");
        const settingsRes = await db.query("SELECT tax_rate, delivery_fee FROM pharmacy_settings ORDER BY created_at DESC LIMIT 1");

        const pharmacySettings = {
            ...(settingsRes.rows[0] || { tax_rate: 0.10, delivery_fee: 5.00 }),
            is_open: statusRes.rows.length > 0 ? statusRes.rows[0].is_open : true
        };

        res.render('doctor/dashboard', {
            user: req.user,
            activeShift,
            previousShifts,
            pendingPrescriptions,
            activeOrders,
            trendingRequests,
            pharmacySettings,
            pageTitle: 'Doctor Dashboard'
        });

    } catch (err) {
        console.error('Doctor Dashboard Error:', err);
        req.flash('error', 'Failed to load dashboard.');
        res.redirect('/');
    }
};

// Get Live Dashboard Stats (API endpoint for real-time updates)
export const getDashboardStats = async (req, res) => {
    try {
        const doctorId = req.user.id;

        // Get active shift
        const shiftRes = await db.query(
            "SELECT * FROM shifts WHERE opened_by = $1 AND status = 'open' LIMIT 1",
            [doctorId]
        );
        const activeShift = shiftRes.rows[0] || null;

        // Get pending orders count
        const ordersCountRes = await db.query(
            "SELECT COUNT(*) as count FROM orders WHERE status IN ('scheduled', 'pending', 'processing')"
        );
        const ordersCount = parseInt(ordersCountRes.rows[0].count);

        // Get pending prescriptions count
        const presCountRes = await db.query(
            "SELECT COUNT(*) as count FROM prescriptions WHERE status = 'reviewing'"
        );
        const prescriptionsCount = parseInt(presCountRes.rows[0].count);

        // Get low stock items count (stock < 10)
        const lowStockRes = await db.query(
            "SELECT COUNT(*) as count FROM medicines WHERE quantity < 10"
        );
        const lowStockCount = parseInt(lowStockRes.rows[0].count);

        // Get scheduled orders count (waiting for pharmacy to open)
        const scheduledRes = await db.query(
            "SELECT COUNT(*) as count FROM orders WHERE status = 'scheduled'"
        );
        const scheduledOrdersCount = parseInt(scheduledRes.rows[0].count);

        // Get total product requests (all-time)
        const totalRequestsRes = await db.query(
            "SELECT COUNT(*) as count FROM product_requests"
        );
        const totalRequests = parseInt(totalRequestsRes.rows[0].count);

        // Calculate Live Shift Data
        let liveRevenue = 0;
        let shiftOrdersCount = 0;
        let shiftPrescriptionsCount = 0;
        let shiftReturnsCount = 0;

        if (activeShift) {
            // Gross Revenue & Orders Count (Orders)
            const grossRes = await db.query(
                "SELECT COALESCE(SUM(total_price), 0) as gross, COUNT(*) as count FROM orders WHERE shift_id = $1",
                [activeShift.id]
            );
            const gross = parseFloat(grossRes.rows[0].gross || 0);
            shiftOrdersCount = parseInt(grossRes.rows[0].count || 0);

            // Refunds (Returns)
            const returnRes = await db.query(
                "SELECT COALESCE(SUM(refund_amount), 0) as refunds, COUNT(*) as count FROM returns WHERE shift_id = $1",
                [activeShift.id]
            );
            const refunds = parseFloat(returnRes.rows[0].refunds || 0);
            shiftReturnsCount = parseInt(returnRes.rows[0].count || 0);

            liveRevenue = gross - refunds;

            // Prescriptions Processed in Shift
            const presRes = await db.query(
                "SELECT COUNT(*) as count FROM prescriptions WHERE shift_id = $1",
                [activeShift.id]
            );
            shiftPrescriptionsCount = parseInt(presRes.rows[0].count || 0);
        }

        // Get pharmacy status
        const statusRes = await db.query("SELECT is_open FROM pharmacy_status_logs ORDER BY created_at DESC LIMIT 1");
        const isOpen = statusRes.rows.length > 0 ? statusRes.rows[0].is_open : true;

        res.json({
            success: true,
            data: {
                shiftActive: !!activeShift,
                shiftActive: !!activeShift,
                shiftStartedAt: activeShift ? activeShift.created_at : null,
                revenue: liveRevenue.toFixed(2),
                shiftOrdersCount,
                shiftPrescriptionsCount,
                shiftReturnsCount,
                ordersCount,
                prescriptionsCount,
                totalRequests,
                lowStockCount,
                scheduledOrdersCount,
                pharmacyOpen: isOpen
            }
        });

    } catch (err) {
        console.error('Dashboard Stats Error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
};

// API: Get All Orders (for filtering)
export const getAllOrders = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT o.*, u.full_name as user_name, u.email as user_email 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
        `);

        res.json({
            success: true,
            orders: result.rows
        });
    } catch (err) {
        console.error('API Orders Error:', err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// API: Get Order Items (for order details expansion)
export const getOrderItems = async (req, res) => {
    try {
        const { orderId } = req.params;

        const result = await db.query(`
            SELECT oi.*, m.name as medicine_name, m.image_url
            FROM order_items oi
            LEFT JOIN medicines m ON oi.medicine_id = m.id
            WHERE oi.order_id = $1
        `, [orderId]);

        res.json({
            success: true,
            items: result.rows
        });
    } catch (err) {
        console.error('API Order Items Error:', err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Start Shift
export const startShift = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const activeCheck = await db.query("SELECT id FROM shifts WHERE opened_by = $1 AND status = 'open'", [doctorId]);
        if (activeCheck.rows.length > 0) {
            req.flash('error', 'You already have an active shift.');
            return res.redirect('/doctor/dashboard');
        }
        const shiftRes = await db.query(
            "INSERT INTO shifts (opened_by, opened_at, status) VALUES ($1, NOW(), 'open') RETURNING id",
            [doctorId]
        );
        const newShiftId = shiftRes.rows[0].id;

        // Activate Scheduled Orders
        await db.query(
            "UPDATE orders SET status = 'pending', shift_id = $1 WHERE status = 'scheduled'",
            [newShiftId]
        );

        req.flash('success', 'Shift started successfully. Scheduled orders have been activated.');
        res.redirect('/doctor/dashboard');
    } catch (err) {
        console.error('Start Shift Error:', err);
        req.flash('error', 'Failed to start shift.');
        res.redirect('/doctor/dashboard');
    }
};

// End Shift
export const endShift = async (req, res) => {
    try {
        const { shiftId } = req.body;
        const doctorId = req.user.id;

        // Calculate shift metrics
        const metricsRes = await db.query(`
            SELECT 
                COALESCE(COUNT(DISTINCT o.id), 0) as total_orders,
                COALESCE(SUM(o.total_price), 0) as gross_revenue
            FROM orders o
            WHERE o.shift_id = $1
        `, [shiftId]);

        const metrics = metricsRes.rows[0];

        // Calculate Returns for this shift
        const returnsRes = await db.query(
            "SELECT COALESCE(SUM(refund_amount), 0) as total_refunds, COUNT(*) as count FROM returns WHERE shift_id = $1",
            [shiftId]
        );
        const totalRefunds = parseFloat(returnsRes.rows[0].total_refunds || 0);
        const returnCount = parseInt(returnsRes.rows[0].count || 0);

        const netRevenue = parseFloat(metrics.gross_revenue) - totalRefunds;

        // Update shift with final metrics
        await db.query(
            `UPDATE shifts SET 
                status = 'closed',
                closed_by = $1,
                closed_at = NOW(),
                total_orders = $2,
                total_returns = $3,
                gross_revenue = $4,
                net_revenue = $5
             WHERE id = $6`,
            [doctorId, metrics.total_orders, returnCount, metrics.gross_revenue, netRevenue, shiftId]
        );

        // Audit Log
        const { logEvent } = await import("./auditController.js");
        await logEvent('SHIFT_CLOSE', shiftId, 'shifts', doctorId, {
            gross: metrics.gross_revenue,
            net: netRevenue,
            total_orders: metrics.total_orders,
            total_returns: returnCount
        });

        req.flash('success', 'Shift ended. Summary recorded.');
        res.redirect('/doctor/dashboard');
    } catch (err) {
        console.error('End Shift Error:', err);
        req.flash('error', 'Failed to end shift.');
        res.redirect('/doctor/dashboard');
    }
};


// Toggle Pharmacy Status
// Toggle Pharmacy Status (Log History)
export const togglePharmacyStatus = async (req, res) => {
    try {
        const { isOpen } = req.body;
        // Handle both boolean and string inputs
        const status = isOpen === true || isOpen === 'true';
        const doctorId = req.user.id;

        // INSERT new log entry
        await db.query(
            "INSERT INTO pharmacy_status_logs (id, is_open, created_by, created_at) VALUES (gen_random_uuid(), $1, $2, NOW())",
            [status, doctorId]
        );

        // Audit Log
        const { logEvent } = await import("./auditController.js");
        await logEvent('PHARMACY_TOGGLE', null, 'pharmacy_status', doctorId, { isOpen: status });

        if (status) {
            // Get all scheduled orders that will be updated
            const scheduledOrders = await db.query(
                "SELECT id, user_id FROM orders WHERE status = 'scheduled'"
            );

            // Update their status
            await db.query("UPDATE orders SET status = 'pending' WHERE status = 'scheduled'");

            // Log each status change for audit trail
            for (const order of scheduledOrders.rows) {
                await logOrderStatusChange(order.id, 'scheduled', 'pending', order.user_id);
            }
        }

        // Invalidate cache to ensure fresh data on next page load
        const { invalidateSettingsCache } = await import('../middleware/globalState.js');
        invalidateSettingsCache();

        // Emit realtime event
        const io = req.app.get('io');
        console.log('🔄 Pharmacy Status Toggle:', { status, hasIO: !!io });

        if (io) {
            // Emit to all connected clients
            io.emit('pharmacy:status', { isOpen: status });
            console.log('✅ Socket event emitted to all clients:', { isOpen: status });
        } else {
            console.error('❌ Socket.io instance not found!');
        }

        res.json({ success: true, isOpen: status });
    } catch (err) {
        console.error('Toggle Pharmacy Error:', err);
        res.status(500).json({ success: false });
    }
};

// Prescription Processing View
export const getProcessPrescription = async (req, res) => {
    const { id } = req.params;
    try {
        const presRes = await db.query(
            "SELECT p.*, u.full_name as user_name FROM prescriptions p JOIN users u ON p.user_id = u.id WHERE p.id = $1",
            [id]
        );
        const medicinesRes = await db.query("SELECT id, name, price FROM medicines ORDER BY name ASC");
        res.render('doctor/process_prescription', {
            prescription: presRes.rows[0],
            medicines: medicinesRes.rows,
            pageTitle: 'Process Prescription'
        });
    } catch (err) {
        console.error('Get Process Prescription Error:', err);
        res.redirect('/doctor/dashboard');
    }
};

// Submit Processed Prescription
export const submitPrescriptionProcessing = async (req, res) => {
    const { prescriptionId, medicines, notes, totalPrice } = req.body;
    const doctorId = req.user.id;
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Active Shift
        const shiftRes = await client.query(
            "SELECT id FROM shifts WHERE opened_by = $1 AND status = 'open' LIMIT 1",
            [doctorId]
        );
        const shiftId = shiftRes.rows[0]?.id || null;

        // 2. Insert Final Decision
        await client.query(
            `INSERT INTO prescription_final (prescription_id, approved_by, final_meds, notes, total_price) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (prescription_id) DO UPDATE 
             SET approved_by = $2, final_meds = $3, notes = $4, total_price = $5, approved_at = NOW()`,
            [prescriptionId, doctorId, JSON.stringify(medicines), notes, totalPrice]
        );

        // 3. Update Prescription Status & Shift Link
        await client.query(
            "UPDATE prescriptions SET status = 'processing', shift_id = $1 WHERE id = $2",
            [shiftId, prescriptionId]
        );

        // 4. Update Shift Stats (Optimized: Using shift ID directly + check if shift exists)
        if (shiftId) {
            await client.query(
                "UPDATE shifts SET total_prescriptions = COALESCE(total_prescriptions, 0) + 1 WHERE id = $1",
                [shiftId]
            );
        }

        await client.query('COMMIT');
        req.flash('success', 'Prescription processed successfully.');
        res.redirect('/doctor/dashboard');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Submit Prescription Processing Error:', err);
        req.flash('error', 'Failed to process prescription.');
        res.redirect(`/doctor/prescriptions/${prescriptionId}/process`);
    } finally {
        client.release();
    }
};

// Update Order State
export const updateOrderState = async (req, res) => {
    const { orderId, newState } = req.body;
    try {
        // Get current order status for logging
        const currentOrder = await db.query("SELECT status FROM orders WHERE id = $1", [orderId]);
        const oldStatus = currentOrder.rows[0]?.status;

        // Update order status
        await db.query("UPDATE orders SET status = $1 WHERE id = $2", [newState, orderId]);

        // Log status change for audit trail
        await logOrderStatusChange(orderId, oldStatus, newState, req.user.id);

        res.json({ success: true });
    } catch (err) {
        console.error('Update Order State Error:', err);
        res.status(500).json({ success: false });
    }
};

// Add Inventory Item
export const addInventoryItem = async (req, res) => {
    const { name, price, description, category, imageUrl } = req.body;
    try {
        await db.query(
            "INSERT INTO medicines (name, price, description, category, image_url) VALUES ($1, $2, $3, $4, $5)",
            [name, price, description, category, imageUrl]
        );
        req.flash('success', 'Medicine added to inventory.');
        res.redirect('/doctor/dashboard');
    } catch (err) {
        console.error('Add Inventory Error:', err);
        req.flash('error', 'Failed to add medicine.');
        res.redirect('/doctor/dashboard');
    }
};

// Get list of active chats
export const getChats = async (req, res) => {
    try {
        const chatsRes = await db.query(`
            SELECT c.*, u.full_name as patient_name, u.id as patient_id,
            (SELECT order_uid FROM orders WHERE user_id = c.patient_id ORDER BY created_at DESC LIMIT 1) as latest_order_uid,
            (SELECT id FROM orders WHERE user_id = c.patient_id ORDER BY created_at DESC LIMIT 1) as latest_order_id
            FROM chats c 
            JOIN users u ON c.patient_id = u.id 
            WHERE c.status = 'active' 
            ORDER BY c.last_message_at DESC
        `);
        res.json({ success: true, chats: chatsRes.rows });
    } catch (err) {
        console.error('Get Chats Error:', err);
        res.status(500).json({ success: false });
    }
};

// Get messages for a specific chat
export const getChatMessages = async (req, res) => {
    const { chatId } = req.params;
    try {
        const messagesRes = await db.query(
            "SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC",
            [chatId]
        );
        res.json({ success: true, messages: messagesRes.rows });
    } catch (err) {
        console.error('Get Messages Error:', err);
        res.status(500).json({ success: false });
    }
};

// Send message from doctor
export const sendChatMessage = async (req, res) => {
    const { chatId, message } = req.body;
    const doctorId = req.user.id;
    try {
        const chatRes = await db.query("SELECT patient_id FROM chats WHERE id = $1", [chatId]);
        const patientId = chatRes.rows[0]?.patient_id;

        await db.query(
            "UPDATE chats SET pharmacist_id = $1 WHERE id = $2 AND pharmacist_id IS NULL",
            [doctorId, chatId]
        );
        await db.query(
            "INSERT INTO messages (chat_id, sender_id, message, type, read, created_at) VALUES ($1, $2, $3, 'text', false, NOW())",
            [chatId, doctorId, message]
        );
        await db.query("UPDATE chats SET last_message_at = NOW() WHERE id = $1", [chatId]);

        // Realtime Emit
        const io = req.app.get('io');
        if (io && patientId) {
            io.to(`user_${patientId}`).emit('chat:message', {
                senderId: doctorId,
                message: message,
                timestamp: new Date(),
                isDoctor: true
            });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Send Doctor Message Error:', err);
        res.status(500).json({ success: false });
    }
};

// ==========================================
// RETURNS MODULE (Doctor Dashboard)
// ==========================================

// Search Order for Return
export const searchReturnOrder = async (req, res) => {
    try {
        const { query } = req.query; // Order ID or User Phone/Email
        if (!query) return res.json({ success: false, error: 'Query required' });

        const sql = `
            SELECT o.id, o.order_uid, o.created_at, o.total_price, 
                   u.full_name as user_name, u.email as user_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE (o.order_uid ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1 OR u.full_name ILIKE $1)
            AND o.status IN ('completed', 'delivered')
            ORDER BY o.created_at DESC
            LIMIT 5
        `;
        const result = await db.query(sql, [`%${query}%`]);
        res.json({ success: true, orders: result.rows });
    } catch (err) {
        console.error('Search Return Order Error:', err);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
};

// Get Order Items for Return Selection
export const getOrderItemsForReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const result = await db.query(`
            SELECT oi.id, oi.medicine_id, oi.quantity, oi.price, m.name as medicine_name
            FROM order_items oi
            JOIN medicines m ON oi.medicine_id = m.id
            WHERE oi.order_id = $1
        `, [orderId]);
        res.json({ success: true, items: result.rows });
    } catch (err) {
        console.error('Get Order Items Error:', err);
        res.status(500).json({ success: false });
    }
};

// Process New Return (Instant)
export const processReturn = async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const { orderId, items, reason, condition, updateInventory, notes } = req.body;
        const doctorId = req.user.id;

        // 1. Get Active Shift ID
        const shiftRes = await client.query(
            "SELECT id FROM shifts WHERE opened_by = $1 AND status = 'open' LIMIT 1",
            [doctorId]
        );
        const shiftId = shiftRes.rows[0]?.id || null;

        if (!shiftId) {
            throw new Error("No active shift found. Cannot process return.");
        }

        // 2. Calculate Refund Amount
        let totalRefund = 0;
        for (const item of items) {
            // item = { id (order_item_id), medicine_id, quantity, price }
            totalRefund += Number(item.price) * Number(item.quantity);
        }

        // 3. Create Return Record
        const returnRes = await client.query(
            `INSERT INTO returns (
                order_id, user_id, status, reason, admin_notes, refund_amount, shift_id, created_at, updated_at
            ) VALUES (
                $1, 
                (SELECT user_id FROM orders WHERE id = $1), 
                'approved', $2, $3, $4, $5, NOW(), NOW()
            ) RETURNING id`,
            [orderId, reason, notes, totalRefund, shiftId]
        );
        const returnId = returnRes.rows[0].id;

        // 4. Process Items & Inventory
        for (const item of items) {
            // Insert into return_items
            await client.query(
                `INSERT INTO return_items (return_id, medicine_id, quantity, condition)
                 VALUES ($1, $2, $3, $4)`,
                [returnId, item.medicine_id, item.quantity, condition]
            );

            // Update Inventory if requested and resellable
            if (updateInventory && condition === 'resellable') {
                await inventoryController.logAdjustment(
                    client,
                    item.medicine_id,
                    'return_restock',
                    item.quantity,
                    returnId,
                    doctorId,
                    `Return #${returnId} (Restock)`
                );
            }
        }

        // 5. Update Shift Stats (Total Returns Count)
        await client.query(
            "UPDATE shifts SET total_returns = COALESCE(total_returns, 0) + 1 WHERE id = $1",
            [shiftId]
        );

        await client.query('COMMIT');

        res.json({ success: true, returnId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Process Return Error:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

// Get Recent Returns
export const getRecentReturns = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT r.*, o.order_uid
            FROM returns r
            JOIN orders o ON r.order_id = o.id
            ORDER BY r.created_at DESC
            LIMIT 10
        `);
        res.json({ success: true, returns: result.rows });
    } catch (err) {
        console.error('Get Recent Returns Error:', err);
        res.status(500).json({ success: false });
    }
};

// Export Shift PDF (Print View)
export const exportShiftPdf = async (req, res) => {
    try {
        const { id } = req.params;
        const doctorId = req.user.id;

        // Fetch shift details
        const shiftRes = await db.query("SELECT * FROM shifts WHERE id = $1", [id]);
        if (shiftRes.rows.length === 0) {
            req.flash('error', 'Shift not found');
            return res.redirect('/doctor/dashboard');
        }
        const shift = shiftRes.rows[0];

        // Fetch user (doctor) details
        const userRes = await db.query("SELECT * FROM users WHERE id = $1", [shift.opened_by]);
        const doctor = userRes.rows[0] || { full_name: 'Unknown' };

        // Fetch shift orders
        const ordersRes = await db.query(
            "SELECT o.*, u.full_name as user_name FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.shift_id = $1 ORDER BY o.created_at DESC",
            [id]
        );
        const orders = ordersRes.rows;

        // Fetch shift returns
        const returnsRes = await db.query(
            "SELECT r.*, u.full_name as user_name FROM returns r LEFT JOIN users u ON r.user_id = u.id WHERE r.shift_id = $1 ORDER BY r.created_at DESC",
            [id]
        );
        const returns = returnsRes.rows;

        // Render Print View
        res.render('doctor/shiftReportPdf', {
            shift,
            doctor,
            orders,
            returns,
            generatedAt: new Date()
        });

    } catch (err) {
        console.error('Export Shift PDF Error:', err);
        req.flash('error', 'Failed to generate report.');
        res.redirect('/doctor/dashboard');
    }
};
