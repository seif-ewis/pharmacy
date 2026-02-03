/**
 * Emit Socket.IO events to the 'admin' room so the admin dashboard top bar
 * (store status, active shift, live revenue) updates in near-real time when
 * orders, shifts, pharmacy status, or prescriptions change.
 */

/**
 * Notify admin clients that summary data changed; they should refetch GET /admin/summary.
 */
export function emitAdminSummaryInvalidated(app) {
    try {
        const io = app?.get?.('io');
        if (io) {
            io.to('admin').emit('admin:summary-update');
        }
    } catch (err) {
        console.error('adminDashboardEvents.emitAdminSummaryInvalidated:', err);
    }
}
