/**
 * Emit Socket.IO events to the 'doctors' room for real-time dashboard updates.
 * Used when orders, prescriptions, pharmacy status, or stats change so the
 * doctor dashboard can update via WebSocket instead of polling.
 */

/**
 * Emit an event to all connected doctor clients.
 * @param {object} app - Express app (req.app)
 * @param {string} event - Socket.IO event name (e.g. 'dashboard:stats-update', 'orders:new')
 * @param {object} [payload] - Optional payload to send
 */
export function emitToDoctors(app, event, payload = {}) {
    try {
        const io = app?.get?.('io');
        if (io) {
            io.to('doctors').emit(event, payload);
        }
    } catch (err) {
        console.error('doctorDashboardEvents.emitToDoctors:', err);
    }
}

/**
 * Notify doctors that dashboard stats are stale; clients should refetch /doctor/dashboard/stats.
 */
export function emitDashboardStatsInvalidated(app) {
    emitToDoctors(app, 'dashboard:stats-update', { invalidated: true });
}

/**
 * Notify doctors that a new order was created (e.g. by a customer).
 */
export function emitOrdersNew(app, orderSummary = {}) {
    emitToDoctors(app, 'orders:new', orderSummary);
}

/**
 * Notify doctors that an order was updated (status change, etc.).
 */
export function emitOrdersUpdate(app, orderSummary = {}) {
    emitToDoctors(app, 'orders:update', orderSummary);
}

/**
 * Notify doctors that a new prescription is pending (e.g. customer upload).
 */
export function emitPrescriptionsNew(app, prescriptionSummary = {}) {
    emitToDoctors(app, 'prescriptions:new', prescriptionSummary);
}

/**
 * Notify doctors that a prescription was updated (e.g. processed).
 */
export function emitPrescriptionsUpdate(app, prescriptionSummary = {}) {
    emitToDoctors(app, 'prescriptions:update', prescriptionSummary);
}

/**
 * Notify doctors that a return was created or updated (optional).
 */
export function emitReturnsNew(app, returnSummary = {}) {
    emitToDoctors(app, 'returns:new', returnSummary);
}
