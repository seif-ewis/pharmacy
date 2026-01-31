
import db from '../config/dataBase.js';
import * as inventoryController from './inventoryController.js';
import { formatTimeAgo } from '../utils/formatDate.js';
import { logOrderStatusChange } from '../utils/orderStatusLogger.js';
import { generateProductDetails as aiGenerate, analyzePrescription } from '../services/aiService.js';
import { v4 as uuidv4 } from 'uuid';

// Get Dashboard
export const getDashboard = async (req, res) => {
    try {
        const doctorId = req.user.id;

        // Check for active shift (My Shift)
        /**
         * NOTE: Shift-based revenue reporting is OPERATIONAL, not accounting-grade.
         * Revenue is earned in the shift of completion (completed_shift_id) 
         * and reversed in the shift of return (returned_shift_id).
         */
        const shiftRes = await db.query(
            "SELECT * FROM shifts WHERE opened_by = $1 AND status = 'open' LIMIT 1",
            [doctorId]
        );
        let activeShift = shiftRes.rows[0] || null;

        // Check for ANY active shift (Global Lock)
        const globalShiftRes = await db.query(`
            SELECT s.*, u.full_name as doctor_name 
            FROM shifts s 
            JOIN users u ON s.opened_by = u.id 
            WHERE s.status = 'open' 
            LIMIT 1
        `);
        const globalActiveShift = globalShiftRes.rows[0] || null;

        // Calculate LIVE Shift Stats (Operational Model)
        if (activeShift) {
            const shiftMetricsRes = await db.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN completed_shift_id = $1 AND completed_at IS NOT NULL THEN total_price ELSE 0 END), 0) as gross_revenue,
                    COALESCE(SUM(CASE WHEN returned_shift_id = $1 AND returned_at IS NOT NULL THEN total_price ELSE 0 END), 0) as total_refunds,
                    COUNT(id) FILTER (WHERE completed_shift_id = $1 AND completed_at IS NOT NULL) as total_orders,
                    COUNT(id) FILTER (WHERE returned_shift_id = $1 AND returned_at IS NOT NULL) as total_returns
                FROM orders
                WHERE completed_shift_id = $1 OR returned_shift_id = $1
            `, [activeShift.id]);

            const metrics = shiftMetricsRes.rows[0];
            activeShift.gross_revenue = parseFloat(metrics.gross_revenue);
            activeShift.total_refunds = parseFloat(metrics.total_refunds);
            activeShift.net_revenue = activeShift.gross_revenue - activeShift.total_refunds;
            activeShift.total_orders = parseInt(metrics.total_orders);
            activeShift.total_returns = parseInt(metrics.total_returns);

            // Live Prescriptions Processed in Shift
            const shiftPresRes = await db.query(
                `SELECT COUNT(*) as count 
                 FROM prescriptions 
                 WHERE shift_id = $1`,
                [activeShift.id]
            );

            // Overwrite stale shift data with live data
            activeShift = {
                ...activeShift,
                gross_revenue: activeShift.gross_revenue.toFixed(2),
                total_refunds: activeShift.total_refunds.toFixed(2),
                net_revenue: activeShift.net_revenue.toFixed(2),
                total_orders: activeShift.total_orders,
                total_returns: activeShift.total_returns,
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
            "SELECT o.*, u.full_name as user_name, u.phone as user_phone FROM orders o JOIN users u ON o.user_id = u.id WHERE o.status IN ('scheduled', 'pending', 'processing') ORDER BY o.created_at ASC"
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

        // Fetch Categories
        const catRes = await db.query("SELECT DISTINCT category FROM medicines WHERE category IS NOT NULL ORDER BY category ASC");
        const categories = catRes.rows.map(r => r.category);

        res.render('doctor/dashboard', {
            user: req.user,
            activeShift,
            globalActiveShift, // Pass global shift info
            previousShifts,
            pendingPrescriptions,
            activeOrders,
            trendingRequests,
            pharmacySettings,
            categories, // Pass categories
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
        const lowStockRes = await db.query(`
            SELECT COUNT(*) as count 
            FROM medicines m
            LEFT JOIN medicine_stock ms ON ms.id = m.id
            WHERE COALESCE(ms.current_stock, 0) < 10
        `);
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
        // Calculate Live Shift Data (Operational Model)
        let grossRevenue = 0;
        let returnsValue = 0;
        let netRevenue = 0;
        let shiftOrdersCount = 0;
        let shiftPrescriptionsCount = 0;
        let shiftReturnsCount = 0;

        if (activeShift) {
            const shiftMetricsRes = await db.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN completed_shift_id = $1 AND completed_at IS NOT NULL THEN total_price ELSE 0 END), 0) as gross,
                    COALESCE(SUM(CASE WHEN returned_shift_id = $1 AND returned_at IS NOT NULL THEN total_price ELSE 0 END), 0) as refunds,
                    COUNT(id) FILTER (WHERE completed_shift_id = $1 AND completed_at IS NOT NULL) as orders_count,
                    COUNT(id) FILTER (WHERE returned_shift_id = $1 AND returned_at IS NOT NULL) as returns_count
                FROM orders
                WHERE completed_shift_id = $1 OR returned_shift_id = $1
            `, [activeShift.id]);

            const metrics = shiftMetricsRes.rows[0];
            grossRevenue = parseFloat(metrics.gross);
            returnsValue = parseFloat(metrics.refunds);
            netRevenue = grossRevenue - returnsValue;
            shiftOrdersCount = parseInt(metrics.orders_count);
            shiftReturnsCount = parseInt(metrics.returns_count);

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
                shiftStartedAt: activeShift ? activeShift.created_at : null,
                revenue: netRevenue.toFixed(2),
                grossRevenue: grossRevenue.toFixed(2),
                returnsValue: returnsValue.toFixed(2),
                netRevenue: netRevenue.toFixed(2),
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
            SELECT o.*, u.full_name as user_name, u.email as user_email, u.phone as user_phone,
            d.full_name as doctor_name
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            LEFT JOIN shifts s ON o.shift_id = s.id
            LEFT JOIN users d ON s.opened_by = d.id
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
        const activeCheck = await db.query("SELECT id FROM shifts WHERE status = 'open' LIMIT 1");
        if (activeCheck.rows.length > 0) {
            req.flash('error', 'Another shift is currently active. Please close it first.');
            return res.redirect('/doctor/dashboard');
        }
        const shiftRes = await db.query(
            "INSERT INTO shifts (opened_by, opened_at, status) VALUES ($1, NOW(), 'open') RETURNING id",
            [doctorId]
        );
        const newShiftId = shiftRes.rows[0].id;

        // Activate Scheduled & Orphan Assignments
        await db.query(
            "UPDATE orders SET status = 'pending', shift_id = $1 WHERE status = 'scheduled' OR (status = 'pending' AND shift_id IS NULL)",
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

// Get Shift Details (JSON)
export const getShiftDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const shiftRes = await db.query("SELECT * FROM shifts WHERE id = $1", [id]);

        if (shiftRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Shift not found' });
        }

        res.json({ success: true, shift: shiftRes.rows[0] });
    } catch (err) {
        console.error('Get Shift Details Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
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
    const doctorId = req.user.id;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Get current order details
        const currentOrderRes = await client.query(
            "SELECT status, completed_shift_id, returned_shift_id FROM orders WHERE id = $1 FOR UPDATE",
            [orderId]
        );
        if (currentOrderRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        const order = currentOrderRes.rows[0];
        const oldStatus = order.status;

        // 2. Validate Status Transitions (Governance)
        const terminalStates = ['completed', 'delivered', 'canceled', 'returned'];

        // Prevent re-completing something already completed/delivered/canceled/returned
        if (terminalStates.includes(oldStatus) && (newState === 'completed' || newState === 'delivered')) {
            return res.status(400).json({ success: false, message: `Cannot change order to ${newState} once it is ${oldStatus}` });
        }

        // Prevent returned orders from moving back to any other state
        if (oldStatus === 'returned') {
            return res.status(400).json({ success: false, message: "Returned orders cannot change state" });
        }

        // Prevent canceled orders from moving back to any other state
        if (oldStatus === 'canceled' && newState !== 'returned') { // Maybe allow returned if refunding canceled? Usually canceled = no money.
            return res.status(400).json({ success: false, message: "Canceled orders cannot change state" });
        }

        // 3. Mandatory Active Shift Guard for Revenue Actions
        let activeShiftId = null;
        if (['completed', 'delivered', 'returned'].includes(newState)) {
            const shiftRes = await client.query(
                "SELECT id FROM shifts WHERE opened_by = $1 AND status = 'open' LIMIT 1",
                [doctorId]
            );
            activeShiftId = shiftRes.rows[0]?.id || null;

            if (!activeShiftId) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: "Active shift required to complete or return an order" });
            }
        }

        // 4. Attribution Logic (Immutability)
        let setClause = "status = $1";
        let params = [newState, orderId];

        if ((newState === 'completed' || newState === 'delivered') && !order.completed_shift_id) {
            setClause += ", completed_shift_id = $3, completed_at = NOW()";
            params.push(activeShiftId);
        } else if (newState === 'returned' && !order.returned_shift_id) {
            setClause += ", returned_shift_id = $3, returned_at = NOW()";
            params.push(activeShiftId);
        } else if (newState === 'canceled') {
            setClause += ", canceled_at = NOW()";
        }

        // 5. Update Order
        await client.query(`UPDATE orders SET ${setClause} WHERE id = $2`, params);

        // 6. Log status change for audit trail
        await logOrderStatusChange(orderId, oldStatus, newState, doctorId, client);

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Update Order State Error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
};

// ==========================================
// INVENTORY MODULE (CRUD)
// ==========================================

// Get All Inventory Items
export const getInventory = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                m.id, 
                m.name, 
                m.price, 
                m.category, 
                m.description, 
                m.image_url,
                m.low_stock_threshold,
                m.created_at,
                COALESCE(ms.current_stock, 0) as current_stock,
                COALESCE(ms.is_low_stock, false) as is_low_stock
            FROM medicines m
            LEFT JOIN medicine_stock ms ON ms.id = m.id
            ORDER BY m.name ASC
        `);

        res.json({
            success: true,
            inventory: result.rows
        });
    } catch (err) {
        console.error('Get Inventory Error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to load inventory'
        });
    }
};

// Get Most Sold Products This Shift (REAL sales data)
export const getMostSoldThisShift = async (req, res) => {
    try {
        // Get current active shift
        const shiftRes = await db.query(
            "SELECT id FROM shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1"
        );

        const activeShiftId = shiftRes.rows[0]?.id;

        if (!activeShiftId) {
            return res.json({
                success: true,
                mostSold: [],
                message: 'No active shift'
            });
        }

        // Query actual sales from order_items joined with orders for this shift
        const result = await db.query(`
            SELECT 
                m.id,
                m.name,
                m.category,
                m.image_url,
                m.price,
                COALESCE(ms.current_stock, 0) as current_stock,
                SUM(oi.quantity) as total_sold,
                COUNT(DISTINCT o.id) as order_count
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN medicines m ON m.id = oi.medicine_id
            LEFT JOIN medicine_stock ms ON ms.id = m.id
            WHERE o.shift_id = $1
              AND o.status NOT IN ('cancelled', 'returned')
            GROUP BY m.id, m.name, m.category, m.image_url, m.price, ms.current_stock
            ORDER BY total_sold DESC
            LIMIT 10
        `, [activeShiftId]);

        res.json({
            success: true,
            shiftId: activeShiftId,
            mostSold: result.rows
        });
    } catch (err) {
        console.error('Get Most Sold Error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to load most sold products'
        });
    }
};


// Generate AI Product Details
export const generateProductDetails = async (req, res) => {
    try {
        const { productName } = req.body;
        if (!productName) {
            return res.status(400).json({ success: false, error: "Product name is required" });
        }

        const details = await aiGenerate(productName);
        res.json({ success: true, data: details });
    } catch (err) {
        console.error("AI Generate Error:", err);
        res.status(500).json({ success: false, error: "AI Generation Failed" });
    }
};

// Create New Inventory Item
export const createInventoryItem = async (req, res) => {
    const {
        name, price, quantity, category, description, imageUrl, lowStockThreshold, benefits, sideEffects,
        aiGenerated, aiReviewed
    } = req.body;

    // Validation
    if (!name || !price || !quantity || !category) {
        return res.status(400).json({
            success: false,
            error: 'Name, price, quantity, and category are required'
        });
    }

    // AI Safety Enforcement (Strict)
    if (aiGenerated === true || aiGenerated === 'true') {
        if (!aiReviewed || (aiReviewed !== true && aiReviewed !== 'true')) {
            return res.status(400).json({
                success: false,
                error: 'AI-generated content must be reviewed and verified before saving.'
            });
        }
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const isAiGenerated = aiGenerated === true || aiGenerated === 'true';
        const isAiReviewed = aiReviewed === true || aiReviewed === 'true';
        const aiReviewedAt = isAiReviewed ? new Date() : null;

        // Create medicine record WITHOUT stock
        const result = await client.query(
            `INSERT INTO medicines
            (name, price, category, description, image_url, low_stock_threshold, benefits, side_effects, ai_generated, ai_reviewed, ai_reviewed_at, created_at)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING * `,
            [
                name, price, category, description || null, imageUrl || null, lowStockThreshold || 10, benefits || null, sideEffects || null,
                isAiGenerated, isAiReviewed, aiReviewedAt
            ]
        );

        const newProduct = result.rows[0];

        // Get current shift for tracking
        const currentShift = await inventoryController.getCurrentShift(client, req.user.id);

        // Log initial stock via adjustment if quantity > 0
        if (quantity > 0) {
            await inventoryController.logAdjustment(
                client,
                newProduct.id,
                'initial_stock',
                parseInt(quantity),
                null,
                req.user.id,
                `Initial stock on product creation: ${name} `,
                currentShift  // Pass shift ID for tracking
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Product added successfully',
            product: { ...newProduct, current_stock: quantity }
        });
    } catch (err) {
        console.error('Create Inventory Item Error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to add product'
        });
    }
};

// Update Inventory Item
export const updateInventoryItem = async (req, res) => {
    const { id } = req.params;
    const { name, price, quantity, category, description, imageUrl, lowStockThreshold, benefits, sideEffects } = req.body;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Get current stock
        const oldStock = await inventoryController.getStock(client, id);
        const stockDelta = parseInt(quantity) - oldStock;

        // Update medicine details (NO stock_quantity field)
        const result = await client.query(
            `UPDATE medicines 
            SET name = $1,
            price = $2,
            category = $3,
            description = $4,
            image_url = $5,
            low_stock_threshold = $6,
            benefits = $7,
            side_effects = $8
            WHERE id = $9
        RETURNING * `,
            [name, price, category, description, imageUrl, lowStockThreshold || 10, benefits || null, sideEffects || null, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Get current shift for tracking
        const currentShift = await inventoryController.getCurrentShift(client, req.user.id);

        // Log adjustment if quantity changed
        if (stockDelta !== 0) {
            await inventoryController.logAdjustment(
                client,
                id,
                'manual_adjustment',
                stockDelta,
                null,
                req.user.id,
                `Manual stock adjustment: ${oldStock} → ${quantity} (${stockDelta > 0 ? '+' : ''}${stockDelta})`,
                currentShift  // Pass shift ID for tracking
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Product updated successfully',
            product: { ...result.rows[0], current_stock: quantity }
        });
    } catch (err) {
        console.error('Update Inventory Item Error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to update product'
        });
    }
};

// Delete Inventory Item
export const deleteInventoryItem = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if medicine is used in any orders
        const ordersCheck = await db.query(
            'SELECT COUNT(*) FROM order_items WHERE medicine_id = $1',
            [id]
        );

        if (parseInt(ordersCheck.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete medicine that has been ordered. Set stock to 0 instead.'
            });
        }

        const result = await db.query(
            'DELETE FROM medicines WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (err) {
        console.error('Delete Inventory Item Error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to delete product'
        });
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
            io.to(`user_${patientId} `).emit('chat:message', {
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
        WHERE(o.order_uid ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1 OR u.full_name ILIKE $1)
            AND o.status IN('completed', 'delivered')
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
            `INSERT INTO returns(
                order_id, user_id, status, reason, admin_notes, refund_amount, shift_id, created_at, updated_at
            ) VALUES(
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
                `INSERT INTO return_items(return_id, medicine_id, quantity, condition)
VALUES($1, $2, $3, $4)`,
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

        // 5. Update Order with Return Attribution (Authority: returned_at)
        await client.query(
            "UPDATE orders SET returned_at = NOW(), returned_shift_id = $1, status = 'returned' WHERE id = $2",
            [shiftId, orderId]
        );

        // 6. Log Status Change (Audit Trail)
        await logOrderStatusChange(orderId, 'completed', 'returned', doctorId, client);

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

// ==========================================
// PRESCRIPTION MODAL API
// ==========================================

// Get Single Prescription Details (JSON)
export const getPrescriptionDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch Prescription + User Info
        const presRes = await db.query(`
            SELECT p.*, u.full_name as user_name, u.email as user_email, u.phone as user_phone
            FROM prescriptions p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.id = $1
        `, [id]);

        if (presRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Prescription not found' });
        }

        const prescription = presRes.rows[0];

        // Fetch AI Results (if any)
        const aiRes = await db.query(`
            SELECT * FROM prescription_ai_results WHERE prescription_id = $1
        `, [id]);

        const aiResult = aiRes.rows[0] || null;

        res.json({
            success: true,
            prescription,
            aiResult
        });

    } catch (err) {
        console.error('Get Prescription Details Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Search Medicines (JSON)
export const searchMedicines = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.length < 2) {
            return res.json({ success: true, medicines: [] });
        }

        const result = await db.query(`
            SELECT m.id, m.name, m.price, m.category, m.image_url, m.description,
            COALESCE((SELECT SUM(quantity_change) FROM inventory_adjustments WHERE medicine_id = m.id), 0) as current_stock
            FROM medicines m
            WHERE m.name ILIKE $1 
            ORDER BY m.name ASC 
            LIMIT 20
        `, [`%${query}%`]);

        res.json({
            success: true,
            medicines: result.rows
        });

    } catch (err) {
        console.error('Search Medicines Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Process Prescription (Approve/Reject)
export const processPrescriptionDecision = async (req, res) => {
    const { prescriptionId, action, medicines, notes } = req.body; // action: 'approve' | 'reject'
    const doctorId = req.user.id;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        if (action === 'reject') {
            await client.query(
                "UPDATE prescriptions SET status = 'rejected' WHERE id = $1",
                [prescriptionId]
            );
            // Optionally notify user
        } else if (action === 'approve') {
            // 1. Get Active Shift
            const shiftRes = await client.query(
                "SELECT id FROM shifts WHERE opened_by = $1 AND status = 'open' LIMIT 1",
                [doctorId]
            );
            const shiftId = shiftRes.rows[0]?.id || null;

            // 2. Create Order
            // Calculate total & Validate Inventory
            let total = 0;
            for (const item of medicines) {
                const currentStock = await inventoryController.getStock(client, item.id);
                if (currentStock < item.quantity) {
                    const medRes = await client.query("SELECT name FROM medicines WHERE id = $1", [item.id]);
                    const medName = medRes.rows[0]?.name || "Unknown Medicine";
                    throw new Error(`Insufficient stock for ${medName}. Available: ${currentStock}, Requested: ${item.quantity}`);
                }
                total += (parseFloat(item.price) * item.quantity);
            }

            // Get User ID from prescription
            const presRes = await client.query("SELECT user_id FROM prescriptions WHERE id = $1", [prescriptionId]);
            const userId = presRes.rows[0]?.user_id;

            // Create Order
            const orderRes = await client.query(`
                INSERT INTO orders (user_id, total_price, status, created_at, shift_id, prescription_id, order_uid)
                VALUES ($1, $2, 'pending', NOW(), $3, $4, $5)
                RETURNING id, order_uid
            `, [userId, total, shiftId, prescriptionId, uuidv4()]);

            const orderId = orderRes.rows[0].id;
            const orderUid = orderRes.rows[0].order_uid;

            // 3. Insert Order Items & Update Inventory
            for (const item of medicines) {
                await client.query(`
                    INSERT INTO order_items (order_id, medicine_id, quantity, price)
                    VALUES ($1, $2, $3, $4)
                 `, [orderId, item.id, item.quantity, item.price]);

                // Log Inventory Adjustment (Sale)
                await inventoryController.logAdjustment(
                    client,
                    item.id,
                    'sale',
                    -Math.abs(item.quantity),
                    orderId,
                    doctorId,
                    `Prescription Order #${orderUid} created`,
                    shiftId
                );
            }

            // 4. Update Prescription Status
            await client.query(
                "UPDATE prescriptions SET status = 'approved', shift_id = $1 WHERE id = $2",
                [shiftId, prescriptionId]
            );

            // 5. Save Decision to prescription_final
            await client.query(`
                INSERT INTO prescription_final (prescription_id, approved_by, final_meds, notes, total_price, approved_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
            `, [prescriptionId, doctorId, JSON.stringify(medicines), notes || '', total]);

            // 6. Update Shift Stats (Removed direct revenue/order count updates - now calculated live)
            if (shiftId) {
                await client.query(
                    "UPDATE shifts SET total_prescriptions = COALESCE(total_prescriptions, 0) + 1 WHERE id = $1",
                    [shiftId]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Prescription ${action}ed successfully` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Process Prescription Error:', err);
        res.status(500).json({ success: false, message: 'Failed to process prescription' });
    } finally {
        client.release();
    }
};

/**
 * Create Manual Order (from Chat)
 */
export const createManualOrder = async (req, res) => {
    const { userId, medicines, notes } = req.body;
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

        if (!shiftId) {
            throw new Error("No active shift found. Please open a shift first.");
        }

        // 2. Calculate total & Validate Inventory
        let total = 0;
        for (const item of medicines) {
            const currentStock = await inventoryController.getStock(client, item.id);
            if (currentStock < item.quantity) {
                const medRes = await client.query("SELECT name FROM medicines WHERE id = $1", [item.id]);
                const medName = medRes.rows[0]?.name || "Unknown Medicine";
                throw new Error(`Insufficient stock for ${medName}. Available: ${currentStock}, Requested: ${item.quantity}`);
            }
            total += (parseFloat(item.price) * item.quantity);
        }

        // 3. Create Order
        const orderRes = await client.query(`
            INSERT INTO orders (user_id, total_price, status, created_at, shift_id, order_uid, admin_notes)
            VALUES ($1, $2, 'pending', NOW(), $3, substr(md5(random()::text), 1, 8), $4)
            RETURNING id, order_uid
        `, [userId, total, shiftId, notes || 'Created via chat']);

        const orderId = orderRes.rows[0].id;
        const orderUid = orderRes.rows[0].order_uid;

        // 4. Insert Order Items & Update Inventory
        for (const item of medicines) {
            await client.query(`
                INSERT INTO order_items (order_id, medicine_id, quantity, price)
                VALUES ($1, $2, $3, $4)
            `, [orderId, item.id, item.quantity, item.price]);

            // Log Inventory Adjustment (Sale)
            await inventoryController.logAdjustment(
                client,
                item.id,
                'sale',
                -Math.abs(item.quantity),
                orderId,
                doctorId,
                `Manual Order #${orderUid} created via chat`,
                shiftId
            );
        }

        // 5. Log Status Change
        await logOrderStatusChange(orderId, null, 'pending', doctorId, client);

        await client.query('COMMIT');
        res.json({ success: true, order_id: orderId, order_uid: orderUid });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create Manual Order Error:', err);
        res.status(500).json({ success: false, message: err.message || 'Failed to create order' });
    } finally {
        client.release();
    }
};

// Analyze Prescription with AI
export const analyzePrescriptionObject = async (req, res) => {
    try {
        const { prescriptionId } = req.body;

        // 1. Fetch prescription image URL
        const presRes = await db.query("SELECT image_url FROM prescriptions WHERE id = $1", [prescriptionId]);
        if (presRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Prescription not found' });

        const imageUrl = presRes.rows[0].image_url;

        // 2. Analyze with AI Service
        // Note: imageUrl needs to be converted to base64 or passed if service supports URL. 
        // Assuming service handles URL or we fetch it here. Only base64 supported by Gemini currently.
        // For now, let's assume we need to fetch the image buffer and convert.

        // Quick hack: If it's a URL, we might need to fetch it. 
        // BUT, for speed, let's assume the frontend passes the base64 if available, 
        // OR we just use the existing logic if it supports URLs (it doesn't, it expects base64).

        // Since we don't have an easy way to fetch URL to base64 here without extra libs (axios/node-fetch),
        // and commonly the image is on Cloudinary.
        // Let's rely on the service to handle it or mock it if we can't fetch.

        // WAIT: The aiService expects `imageBase64`. 
        // We can use a simple fetch if node version supports global fetch (Node 18+).

        let base64Data = null;
        try {
            if (imageUrl.startsWith('http')) {
                const imgRes = await fetch(imageUrl);
                const arrayBuffer = await imgRes.arrayBuffer();
                base64Data = Buffer.from(arrayBuffer).toString('base64');
            } else {
                base64Data = imageUrl; // data URI
            }
        } catch (imgErr) {
            console.error("Image Fetch/Process Error:", imgErr);
            return res.json({ success: true, aiResult: { error: "Image too large or inaccessible for AI analysis." } });
        }

        const aiResult = await analyzePrescription(base64Data);

        // Check if AI returned an explicit error (e.g. unreadable)
        if (aiResult.error) {
            return res.json({ success: true, aiResult });
        }

        // 3. Save result to DB
        await db.query(
            "INSERT INTO prescription_ai_results (id, prescription_id, suggested_meds, confidence_score, created_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (prescription_id) DO UPDATE SET suggested_meds = $3, confidence_score = $4, created_at = NOW()",
            [uuidv4(), prescriptionId, JSON.stringify(aiResult.medicines), aiResult.confidence_score]
        );

        res.json({ success: true, aiResult });

    } catch (err) {
        console.error('AI Analysis Error:', err);
        res.status(500).json({ success: false, message: 'Failed to analyze prescription' });
    }
};

// Get Pending Prescriptions (JSON for polling)
export const getPendingPrescriptions = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, u.full_name as user_name 
            FROM prescriptions p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.status = 'pending' 
            ORDER BY p.created_at ASC
        `);
        res.json({ success: true, prescriptions: result.rows });
    } catch (err) {
        console.error('Error fetching pending prescriptions:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch prescriptions' });
    }
};

// Product Requests Module

/**
 * Get Product Requests for Dashboard (Two Views: Pending vs History)
 */
export const getProductRequests = async (req, res) => {
    try {
        // 1. Pending Requests (Actionable)
        const pendingRes = await db.query(`
            SELECT pr.*, u.full_name, u.email, u.avatar
            FROM product_requests pr
            JOIN users u ON pr.user_id = u.id
            WHERE pr.status = 'pending'
            ORDER BY pr.created_at DESC
        `);

        // 2. Request History (Demand)
        const historyRes = await db.query(`
            SELECT pr.*, u.full_name
            FROM product_requests pr
            JOIN users u ON pr.user_id = u.id
            WHERE pr.status != 'pending'
            ORDER BY pr.created_at DESC
            LIMIT 50
        `);

        res.json({
            success: true,
            pending: pendingRes.rows,
            history: historyRes.rows
        });
    } catch (err) {
        console.error("Get Product Requests Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch requests" });
    }
};

/**
 * Fulfill a Product Request (Mark as done & Notify User)
 */
export const fulfillProductRequest = async (req, res) => {
    const { requestId, matchedMedicineId } = req.body;

    try {
        // 1. Get Request Details
        const reqRes = await db.query("SELECT * FROM product_requests WHERE id = $1", [requestId]);
        if (reqRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }
        const request = reqRes.rows[0];

        // 2. Update Status & Link Medicine
        await db.query(
            "UPDATE product_requests SET status = 'fulfilled', matched_medicine_id = $1 WHERE id = $2",
            [matchedMedicineId || null, requestId]
        );

        // 3. Notify User
        const title = "Request Fulfilled! 🎉";
        let message = `Good news! The product "${request.product_name}" you requested is now available in our pharmacy.`;

        // Enhance message if we have details? (Optional)

        const notifInsert = await db.query(
            "INSERT INTO notifications (title, message, type) VALUES ($1, $2, 'system') RETURNING id",
            [title, message]
        );
        const notifId = notifInsert.rows[0].id;

        await db.query(
            "INSERT INTO user_notifications (user_id, notification_id, sent_at) VALUES ($1, $2, NOW())",
            [request.user_id, notifId]
        );

        res.json({ success: true, message: "Request fulfilled and user notified!" });

    } catch (err) {
        console.error("Fulfill Request Error:", err);
        res.status(500).json({ success: false, message: "Failed to fulfill request" });
    }
};

// Process Return Inline (from Dashboard)
export const processReturnInline = async (req, res) => {
    const { return_id, action } = req.body;
    const userId = req.user.id;

    if (!return_id || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ success: false, message: "Invalid request parameters" });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Get Return Details
        const returnRes = await client.query(`
            SELECT r.*, o.id as order_id, o.order_uid 
            FROM returns r
            JOIN orders o ON r.order_id = o.id
            WHERE r.id = $1
        `, [return_id]);
        if (returnRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Return request not found" });
        }
        const returnReq = returnRes.rows[0];

        // 2. Validate Status
        if (returnReq.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: "Return request is not pending" });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        let activeShiftId = null;

        if (newStatus === 'approved') {
            // 2. Get Active Shift for the Doctor
            const shiftRes = await client.query(
                "SELECT id FROM shifts WHERE opened_by = $1 AND status = 'open' LIMIT 1",
                [userId]
            );
            activeShiftId = shiftRes.rows.length > 0 ? shiftRes.rows[0].id : null;

            // 3. Process Inventory Logic per item (Restock)
            const itemsRes = await client.query("SELECT * FROM return_items WHERE return_id = $1", [return_id]);
            const returnItems = itemsRes.rows;

            for (const item of returnItems) {
                // For inline approval from dashboard, we assume condition is 'good'
                const condition = 'good';

                // Update Item Condition in DB
                await client.query(
                    "UPDATE return_items SET condition = $1 WHERE id = $2",
                    [condition, item.id]
                );

                // Log Inventory Adjustment (Positive change to add back to stock)
                await inventoryController.logAdjustment(
                    client,
                    item.medicine_id,
                    'return_restock',
                    item.quantity,
                    return_id,
                    userId,
                    `Inline Return Approved: ${condition}`,
                    activeShiftId
                );
            }

            // 4. Update Order with Return Attribution (Authority: returned_at)
            await client.query(
                "UPDATE orders SET returned_at = NOW(), returned_shift_id = $1, status = 'returned' WHERE id = $2",
                [activeShiftId, returnReq.order_id]
            );

            // 4.1 Log Status Change (Audit Trail)
            await logOrderStatusChange(returnReq.order_id, 'completed', 'returned', userId, client);
        }

        // 5. Update Return Status and Shift Attribution
        await client.query(
            "UPDATE returns SET status = $1, shift_id = $2, updated_at = NOW() WHERE id = $3",
            [newStatus, activeShiftId, return_id]
        );
        await client.query('COMMIT');
        res.json({ success: true, message: `Return request ${newStatus} with inventory updated` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Inline Return Process Error:", err);
        res.status(500).json({ success: false, message: "Server error during return processing" });
    } finally {
        client.release();
    }
};

// Get Returns Page (Full List)
export const getReturnsPage = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT r.*, u.full_name as user_name, u.email as user_email, o.order_uid
            FROM returns r 
            JOIN users u ON r.user_id = u.id 
            JOIN orders o ON r.order_id = o.id
            ORDER BY r.created_at DESC
        `);

        const returns = result.rows.map(r => ({
            ...r,
            formattedDate: new Date(r.created_at).toLocaleString(),
            statusClass: r.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                r.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }));

        res.render('doctor/returns', {
            user: req.user,
            returns: returns,
            title: 'Manage Returns'
        });
    } catch (err) {
        console.error("Get Returns Page Error:", err);
        res.status(500).send("Server Error");
    }
};


