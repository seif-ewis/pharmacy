/**
 * Emit Socket.IO event `notification:new` to a specific user so their header
 * dropdown updates in real time (e.g. when doctor approves prescription,
 * order placed/cancelled, request fulfilled, stock alert).
 */

let _app = null;

/**
 * Set the Express app so notificationController can emit without req (e.g. notifyUsersOfStock).
 * Call once from server.js after app is created.
 */
export function setApp(app) {
    _app = app;
}

export function getApp() {
    return _app;
}

/**
 * Emit notification:new to a user's socket room (user_${userId}).
 * Payload should match what the header expects: { id, title, message, type, time?, read? }
 */
export function emitNotificationToUser(appOrNull, userId, payload) {
    try {
        const app = appOrNull || _app;
        if (!app) return;
        const io = app.get('io');
        if (!io) return;
        const room = `user_${userId}`;
        io.to(room).emit('notification:new', payload);
    } catch (err) {
        console.error('userNotificationEvents.emitNotificationToUser:', err);
    }
}
