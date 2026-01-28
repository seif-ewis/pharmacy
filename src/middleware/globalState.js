import db from "../config/dataBase.js";

// Simple in-memory cache for pharmacy settings
let settingsCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute refresh rate

// Export helper to invalidate cache
export const invalidateSettingsCache = () => {
    settingsCache = null;
    lastCacheTime = 0;
};

export const globalState = async (req, res, next) => {
    // 1. Security: Sanitize User Object
    // Only pass necessary UI fields to the view layer. 
    // This prevents accidental leakage of sensitive data like password_hash.
    if (req.user) {
        res.locals.user = {
            id: req.user.id,
            full_name: req.user.full_name,
            email: req.user.email,
            role: req.user.role,
            phone: req.user.phone,
            avatar: req.user.avatar
        };
    } else {
        res.locals.user = null;
    }

    // 2. Performance & Reliability: Cache Pharmacy Settings
    // Avoid hitting the database on every single request.
    const now = Date.now();
    if (settingsCache && (now - lastCacheTime < CACHE_TTL)) {
        res.locals.pharmacySettings = settingsCache;
    } else {
        try {
            // Fetch Status
            const statusRes = await db.query(
                "SELECT is_open FROM pharmacy_status_logs ORDER BY created_at DESC LIMIT 1"
            );
            const isOpen = statusRes.rows.length > 0 ? statusRes.rows[0].is_open : true;

            // Fetch Settings
            const settingsRes = await db.query(
                "SELECT tax_rate, delivery_fee FROM pharmacy_settings ORDER BY created_at DESC LIMIT 1"
            );
            const settings = settingsRes.rows[0] || { tax_rate: 0.10, delivery_fee: 5.00 };

            // Combine
            settingsCache = {
                is_open: isOpen,
                tax_rate: settings.tax_rate,
                delivery_fee: settings.delivery_fee
            };

            lastCacheTime = now;
            res.locals.pharmacySettings = settingsCache;
        } catch (err) {
            console.error("Global settings error:", err);
            // Fail Closed: On DB error, assume closed to prevent operations during outage
            res.locals.pharmacySettings = { is_open: false, tax_rate: 0.10, delivery_fee: 5.00 };
        }
    }

    next();
};

// 3. Pre-warm cache on startup (optional but good practice)
invalidateSettingsCache();
// We can trigger an initial load here if DB is ready, but lazy load is safer for module import order.
