
// Real-Time Dashboard Stats Update Script
// Add this to the <script> section at the bottom of dashboard.ejs (before closing </script> tag)

// Fetch and update dashboard stats
async function updateDashboardStats() {
    try {
        const res = await fetch('/doctor/dashboard/stats');
        const { success, data } = await res.json();

        if (success) {
            // Update counters
            document.getElementById('counter-revenue').textContent = '$' + data.revenue;

            const grossEl = document.getElementById('counter-gross-revenue');
            if (grossEl) grossEl.textContent = `(G: $${data.grossRevenue})`;

            const refundEl = document.getElementById('counter-refunds');
            if (refundEl) refundEl.textContent = `(R: $${data.returnsValue})`;

            document.getElementById('counter-orders').textContent = data.ordersCount;
            document.getElementById('counter-prescriptions').textContent = data.prescriptionsCount;
            document.getElementById('counter-total-requests').textContent = data.totalRequests;

            // Update alerts
            document.getElementById('alert-low-stock-count').textContent = data.lowStockCount;
            document.getElementById('alert-scheduled-count').textContent = data.scheduledOrdersCount;

            console.log('📊 Dashboard stats updated:', data);
        }
    } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
    }
}

// Socket.IO listener for real-time updates
if (typeof socket !== 'undefined') {
    socket.on('dashboard:stats-update', (data) => {
        console.log('📡 Received dashboard stats update via socket:', data);

        // Update all counters
        if (data.revenue !== undefined) {
            document.getElementById('counter-revenue').textContent = '$' + data.revenue;

            const grossEl = document.getElementById('counter-gross-revenue');
            if (grossEl && data.grossRevenue !== undefined) grossEl.textContent = `(G: $${data.grossRevenue})`;

            const refundEl = document.getElementById('counter-refunds');
            if (refundEl && data.returnsValue !== undefined) refundEl.textContent = `(R: $${data.returnsValue})`;

            anime({
                targets: '#counter-revenue',
                scale: [1, 1.1, 1],
                duration: 400,
                easing: 'easeOutElastic(1, .8)'
            });
        }

        if (data.ordersCount !== undefined) {
            document.getElementById('counter-orders').textContent = data.ordersCount;
            anime({
                targets: '#counter-orders',
                scale: [1, 1.1, 1],
                duration: 400,
                easing: 'easeOutElastic(1, .8)'
            });
        }

        if (data.prescriptionsCount !== undefined) {
            document.getElementById('counter-prescriptions').textContent = data.prescriptionsCount;
            anime({
                targets: '#counter-prescriptions',
                scale: [1, 1.1, 1],
                duration: 400,
                easing: 'easeOutElastic(1, .8)'
            });
        }

        if (data.totalRequests !== undefined) {
            document.getElementById('counter-total-requests').textContent = data.totalRequests;
        }

        if (data.lowStockCount !== undefined) {
            document.getElementById('alert-low-stock-count').textContent = data.lowStockCount;
        }

        if (data.scheduledOrdersCount !== undefined) {
            document.getElementById('alert-scheduled-count').textContent = data.scheduledOrdersCount;
        }
    });
}

// No timer here: stats are handled inline in dashboard.ejs (Socket.IO + 60s fallback when tab visible).
// If this script is loaded, it only provides updateDashboardStats() and socket listener; no duplicate polling.
