
import db from "../config/dataBase.js";

// Create Announcement
export const createAnnouncement = async (req, res) => {
    try {
        const { title, message, target, scheduledFor } = req.body;
        const createdBy = req.user.id;

        // 1. Insert Announcement Content
        // If scheduledFor is provided, use it; otherwise defaults to NOW() via Trigger or we set it here? 
        // The schema likely has created_at default NOW. scheduled_for is optional.
        // Let's explicitly set status.

        const status = scheduledFor ? 'scheduled' : 'sent';

        const result = await db.query(`
            INSERT INTO announcements (title, message, target_audience, created_by, status, scheduled_for, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *
        `, [title, message, target, createdBy, status, scheduledFor || null]);

        const announcement = result.rows[0];

        // 2. Create Notification Record (Required for user_notifications FK)
        const notifResult = await db.query(`
            INSERT INTO notifications (title, message, type, related_id, created_at)
            VALUES ($1, $2, 'announcement', $3, NOW())
            RETURNING id
        `, [title, message, announcement.id]);

        const notificationId = notifResult.rows[0].id;

        // 3. User Distribution
        // target: 'all', 'active_orders', 'staff', 'customers', 'doctors', 'admins'

        let query = "";
        let params = [notificationId];

        if (target === 'all') {
            // Send to everyone
            query = `
                INSERT INTO user_notifications (user_id, notification_id, read, sent_at)
                SELECT id, $1, false, NOW()
                FROM users
            `;
        } else if (target === 'staff') {
            // Send to doctors, admins, pharmacists
            query = `
                INSERT INTO user_notifications (user_id, notification_id, read, sent_at)
                SELECT u.id, $1, false, NOW()
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name IN ('doctor', 'admin', 'pharmacist')
            `;
        } else if (target === 'doctors') {
            // Send to doctors only
            query = `
                INSERT INTO user_notifications (user_id, notification_id, read, sent_at)
                SELECT u.id, $1, false, NOW()
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'doctor'
            `;
        } else if (target === 'admins') {
            // Send to admins only
            query = `
                INSERT INTO user_notifications (user_id, notification_id, read, sent_at)
                SELECT u.id, $1, false, NOW()
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'admin'
            `;
        } else if (target === 'customers') {
            // Send to patients
            query = `
                INSERT INTO user_notifications (user_id, notification_id, read, sent_at)
                SELECT u.id, $1, false, NOW()
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'patient'
            `;
        }
        // Handle 'active_orders' logic if needed, or simplified for now

        if (query && status === 'sent') {
            await db.query(query, params);

            // Real-time broadcast
            const io = req.app.get('io');
            if (io) {
                broadcastAnnouncement(io, announcement);
            }
        }

        res.json({ success: true, announcement });

    } catch (e) {
        console.error('Create Announcement Error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get All Announcements (History)
// Get All Announcements (History) - Categorized
export const getAnnouncements = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fix: Join with user_roles to get sender_role
        // Use subquery or join for aggregation
        const result = await db.query(`
            SELECT a.*, u.full_name as sender_name, 
                   (SELECT string_agg(r.name, ',') 
                    FROM user_roles ur 
                    JOIN roles r ON ur.role_id = r.id 
                    WHERE ur.user_id = u.id) as sender_roles
            FROM announcements a
            LEFT JOIN users u ON a.created_by = u.id
            ORDER BY a.created_at DESC
            LIMIT 100
        `);

        const all = result.rows;
        const sent = all.filter(a => a.created_by === userId);

        // Determine if admin or doctor message
        // sender_roles is a string "admin,doctor" or "patient" etc.
        const inbox = {
            admin: all.filter(a => a.created_by !== userId && a.sender_roles && a.sender_roles.includes('admin')),
            doctors: all.filter(a => a.created_by !== userId && (!a.sender_roles || !a.sender_roles.includes('admin')))
        };

        res.json({ success: true, announcements: all, inbox, sent });
    } catch (e) {
        console.error('Get Announcements Error:', e);
        res.status(500).send('Server Error');
    }
};

// Helper to broadcast
export const broadcastAnnouncement = (io, announcement) => {
    // 1. Legacy Payload for specific announcement listeners
    const announcementPayload = {
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        target: announcement.target_audience,
        time: announcement.created_at
    };

    // 2. Notification Payload for standard notification bar/toasts
    const notificationPayload = {
        id: announcement.id, // Use announcement ID as related ID
        title: announcement.title,
        message: announcement.message,
        type: 'announcement', // Determines icon/color in UI
        color: 'amber', // UI hint
        target: announcement.target_audience
    };

    if (announcement.target_audience === 'all') {
        io.emit('announcement', announcementPayload);
        // Also emit standard notification to everyone
        io.emit('notification', notificationPayload);

    } else if (announcement.target_audience === 'doctors') {
        // Send to doctor rooms if they exist, or filter client side.
        // Assuming rooms 'doctor' or 'doctors' exist.
        io.to('doctor').emit('announcement', announcementPayload);
        io.to('doctor').emit('notification', notificationPayload);

    } else if (announcement.target_audience === 'admins') {
        io.to('admin').emit('announcement', announcementPayload);
        io.to('admin').emit('notification', notificationPayload);

    } else if (announcement.target_audience === 'customers') {
        // Emit to 'announcement' channel for backwards compatibility if needed
        io.emit('announcement', announcementPayload);
        // Emit notification to everyone (client side filters? or just broadcast).
        io.emit('notification', notificationPayload);
    }
};
