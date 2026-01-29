
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

        // If sent immediately, broadcast it
        if (status === 'sent') {
            const io = req.app.get('io');
            if (io) {
                broadcastAnnouncement(io, announcement);
            }
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
    const payload = {
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        target: announcement.target_audience,
        time: announcement.created_at
    };

    if (announcement.target_audience === 'all') {
        io.emit('announcement', payload);
    } else if (announcement.target_audience === 'staff') {
        io.to('doctors').emit('announcement', payload);
    } else if (announcement.target_audience === 'active_orders') {
        // We broadcast to everyone, and client filters? 
        // Or we assume a room 'active_orders'? 
        // Creating a room for active orders dynamically needs maintenance.
        // For simplicity, we emit to 'announcement:active_orders' and client checks if they have active order?
        // OR better: we emit to individual user rooms.
        // BROADCAST-ONLY means one-way.
        // Let's emit to a specific event that clients listen to.
        io.emit('announcement:active_orders', payload);
    }
};
