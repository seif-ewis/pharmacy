
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

// Initial fetch on page load
document.addEventListener('DOMContentLoaded', () => {
    updateDashboardStats();

    // Refresh every 30 seconds as fallback
    setInterval(updateDashboardStats, 30000);
});
