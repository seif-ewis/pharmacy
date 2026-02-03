import db from "../config/dataBase.js";
import { formatTimeAgo } from "../utils/formatDate.js";
import { emitNotificationToUser, getApp } from "../utils/userNotificationEvents.js";

export const getNotifications = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.json({ success: false, message: "Unauthorized", notifications: [] });
    }

    try {
        const notifResult = await db.query(
            `
            SELECT n.id, n.title, n.message, n.type, n.created_at, un.read
            FROM user_notifications un
            JOIN notifications n ON n.id = un.notification_id
            WHERE un.user_id = $1 AND un.read = false
            ORDER BY un.sent_at DESC
            LIMIT 5
            `,
            [req.user.id]
        );

        const notifications = notifResult.rows.map(n => ({
            ...n,
            time: formatTimeAgo(n.created_at)
        }));

        res.json({ success: true, notifications });
    } catch (err) {
        console.error("Error fetching notifications:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const markAllAsRead = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.json({ success: false, message: "Unauthorized" });
    }

    try {
        await db.query(
            "UPDATE user_notifications SET read = true WHERE user_id = $1",
            [req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Error marking all as read:", err);
        res.status(500).json({ success: false });
    }
};

export const markAsRead = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.json({ success: false, message: "Unauthorized" });
    }
    const { id } = req.params;

    // Logic for Database-based notifications
    // We update the user_notifications table
    // Assuming the ID passed is the NOTIFICATION ID (n.id), not the user_notification join id?
    // In header.ejs: markAsRead('<%= notif.id %>', this) -> notif.id is n.id from the query.

    try {
        await db.query(
            "UPDATE user_notifications SET read = true WHERE notification_id = $1 AND user_id = $2",
            [id, req.user.id]
        );


        res.json({ success: true });
    } catch (err) {
        console.error("Error marking notification as read:", err);
        res.status(500).json({ success: false });
    }
};

/**
 * User: Subscribe to notifications for an out-of-stock product
 */
export const subscribeToStock = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: "Please log in to be notified" });
    }

    const { medicineId } = req.body;
    if (!medicineId) return res.status(400).json({ success: false, message: "Medicine ID required" });

    try {
        // Check if already subscribed
        const check = await db.query(
            "SELECT id FROM availability_notifications WHERE user_id = $1 AND medicine_id = $2 AND is_sent = false",
            [req.user.id, medicineId]
        );

        if (check.rows.length > 0) {
            return res.json({ success: true, message: "You are already subscribed to this product" });
        }

        await db.query(
            "INSERT INTO availability_notifications (user_id, medicine_id) VALUES ($1, $2)",
            [req.user.id, medicineId]
        );

        res.json({ success: true, message: "We'll notify you when it's back in stock!" });
    } catch (err) {
        console.error("Subscribe to Stock Error:", err);
        res.status(500).json({ success: false, message: "Subscription failed" });
    }
};

/**
 * System/Admin: Notify users when a product returns to stock
 */
export const notifyUsersOfStock = async (medicineId) => {
    try {
        const subsResult = await db.query(
            "SELECT an.id, an.user_id, m.name FROM availability_notifications an JOIN medicines m ON m.id = an.medicine_id WHERE an.medicine_id = $1 AND an.is_sent = false",
            [medicineId]
        );

        if (subsResult.rows.length === 0) return;

        for (const sub of subsResult.rows) {
            const title = "Product Available!";
            const message = `${sub.name} is now back in stock! Order it before it runs out again.`;

            // 1. Create notification entry
            const notifInsert = await db.query(
                "INSERT INTO notifications (title, message, type) VALUES ($1, $2, 'stock_alert') RETURNING id",
                [title, message]
            );
            const notifId = notifInsert.rows[0].id;

            // 2. Link to user
            await db.query(
                "INSERT INTO user_notifications (user_id, notification_id, sent_at) VALUES ($1, $2, CURRENT_TIMESTAMP)",
                [sub.user_id, notifId]
            );

            // 3. Mark sub as sent
            await db.query("UPDATE availability_notifications SET is_sent = true WHERE id = $1", [sub.id]);

            // 4. Notify user so notification appears live in header
            emitNotificationToUser(getApp(), sub.user_id, {
                id: notifId,
                title,
                message,
                type: 'stock_alert',
                created_at: new Date(),
                time: 'just now',
                read: false
            });
        }
    } catch (err) {
        console.error("Notify Stock Error:", err);
    }
};
