
import db from '../config/dataBase.js';
import { formatTimeAgo } from '../utils/formatDate.js';

// Get Dashboard
export const getDashboard = async (req, res) => {
    try {
        const doctorId = req.user.id;

        // Check for active shift
        const shiftRes = await db.query(
            "SELECT * FROM shifts WHERE doctor_id = $1 AND is_active = true LIMIT 1",
            [doctorId]
        );
        const activeShift = shiftRes.rows[0] || null;

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

// Start Shift
export const startShift = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const activeCheck = await db.query("SELECT id FROM shifts WHERE doctor_id = $1 AND is_active = true", [doctorId]);
        if (activeCheck.rows.length > 0) {
            req.flash('error', 'You already have an active shift.');
            return res.redirect('/doctor/dashboard');
        }
        await db.query("INSERT INTO shifts (doctor_id, is_active) VALUES ($1, true)", [doctorId]);
        req.flash('success', 'Shift started successfully.');
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
        await db.query("UPDATE shifts SET is_active = false, end_at = NOW() WHERE id = $1", [shiftId]);
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

        if (status) {
            await db.query("UPDATE orders SET status = 'pending' WHERE status = 'scheduled'");
        }

        // Emit realtime event
        const io = req.app.get('io');
        if (io) {
            io.to('doctors').emit('pharmacy:status', { isOpen: status });
            io.emit('pharmacy:status', { isOpen: status });
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
        await client.query(
            `INSERT INTO prescription_final (prescription_id, approved_by, final_meds, notes, total_price) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (prescription_id) DO UPDATE 
             SET approved_by = $2, final_meds = $3, notes = $4, total_price = $5, approved_at = NOW()`,
            [prescriptionId, doctorId, JSON.stringify(medicines), notes, totalPrice]
        );
        await client.query("UPDATE prescriptions SET status = 'processing' WHERE id = $1", [prescriptionId]);
        await client.query(
            "UPDATE shifts SET prescriptions_count = prescriptions_count + 1 WHERE doctor_id = $1 AND is_active = true",
            [doctorId]
        );
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
        await db.query("UPDATE orders SET status = $1 WHERE id = $2", [newState, orderId]);
        if (newState === 'done') {
            const orderRes = await db.query("SELECT total_price FROM orders WHERE id = $1", [orderId]);
            const price = orderRes.rows[0].total_price;
            await db.query(
                "UPDATE shifts SET total_revenue = total_revenue + $1, orders_count = orders_count + 1 WHERE doctor_id = $2 AND is_active = true",
                [price, req.user.id]
            );
        } else if (newState === 'canceled') {
            await db.query(
                "UPDATE shifts SET cancelled_count = cancelled_count + 1 WHERE doctor_id = $1 AND is_active = true",
                [req.user.id]
            );
        }
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
            SELECT c.*, u.full_name as patient_name 
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
        await db.query(
            "UPDATE chats SET pharmacist_id = $1 WHERE id = $2 AND pharmacist_id IS NULL",
            [doctorId, chatId]
        );
        await db.query(
            "INSERT INTO messages (chat_id, sender_id, message, type, read, created_at) VALUES ($1, $2, $3, 'text', false, NOW())",
            [chatId, doctorId, message]
        );
        await db.query("UPDATE chats SET last_message_at = NOW() WHERE id = $1", [chatId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Send Doctor Message Error:', err);
        res.status(500).json({ success: false });
    }
};
