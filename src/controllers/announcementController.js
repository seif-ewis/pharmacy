
import db from "../config/dataBase.js";

// Create Announcement
export const createAnnouncement = async (req, res) => {
    try {
        const { title, message, target, scheduledFor } = req.body;
        const doctorId = req.user.id;

        // Determine status
        let status = 'sent';
        let scheduleDate = null;

        if (scheduledFor) {
            const date = new Date(scheduledFor);
            if (date > new Date()) {
                status = 'scheduled';
                scheduleDate = date;
            }
        }

        const result = await db.query(
            `INSERT INTO announcements (title, message, target_audience, scheduled_for, status, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             RETURNING *`,
            [title, message, target || 'all', scheduleDate, status, doctorId]
        );

        const announcement = result.rows[0];

        // If sent immediately, broadcast AND persist notifications
        if (status === 'sent') {
            const io = req.app.get('io');

            // 1. Broadcast via Socket (Real-time)
            if (io) {
                broadcastAnnouncement(io, announcement);
            }

            // 2. Persist Notifications for Users (So it appears in the bar later)
            // Logic to determine who gets the notification based on target
            let roleCondition = "role = 'customer'"; // Default to customers for safety/common case
            const params = [title, message, 'announcement'];

            if (target === 'all') {
                roleCondition = "1=1"; // All users
            } else if (target === 'staff') {
                roleCondition = "role IN ('doctor', 'admin', 'pharmacist')";
            } else if (target === 'customers') {
                roleCondition = "role = 'customer'";
            }

            // Step A: Insert the Notification Content ONE time
            const notifResult = await db.query(`
                INSERT INTO notifications (title, message, type, created_at)
                VALUES ($1, $2, $3, NOW())
                RETURNING id
            `, params);

            const notificationId = notifResult.rows[0].id;

            // Step B: Batch Link to Users in user_notifications
            // Note: We don't use params for roleCondition because it's a structural part of the query (column/value logic), 
            // but we MUST be careful. Here roleCondition is set internally, so it's safe from injection.
            await db.query(`
                INSERT INTO user_notifications (user_id, notification_id, read, sent_at)
                SELECT id, $1, false, NOW()
                FROM users
                WHERE ${roleCondition}
            `, [notificationId]);
        }

        res.json({ success: true, announcement });
    } catch (err) {
        console.error('Create Announcement Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get All Announcements (History)
export const getAnnouncements = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50`
        );
        res.json({ success: true, announcements: result.rows });
    } catch (err) {
        console.error('Get Announcements Error:', err);
        res.status(500).json({ success: false });
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

    } else if (announcement.target_audience === 'staff') {
        io.to('doctors').emit('announcement', announcementPayload);
        // Emit notification only to staff room (assuming 'doctors' room exists)
        io.to('doctors').emit('notification', notificationPayload);

    } else if (announcement.target_audience === 'customers') {
        // Emit to 'announcement' channel for backwards compatibility if needed
        io.emit('announcement', announcementPayload);
        // Emit notification to everyone (client side filters? or just broadcast).
        // Ideally, we'd emit to 'customers' room, but if that doesn't exist, we broadcast global 'notification'
        // For now, simpler to broadcast 'notification' to all if target is 'customers' (since most users are customers)
        // OR we could check if there is a 'customers' room.
        // Let's assume we want to reach all connected clients.
        io.emit('notification', notificationPayload);
    }
};
