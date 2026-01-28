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
            // Deterministic ordering to ensure we always get the intended row
            const result = await db.query(
                "SELECT is_open, opening_time, closing_time FROM pharmacy_settings ORDER BY id ASC LIMIT 1"
            );

            if (result.rows.length > 0) {
                settingsCache = result.rows[0];
            } else {
                // Fail Closed: If no settings found, assume closed for safety
                settingsCache = { is_open: false };
            }

            lastCacheTime = now;
            res.locals.pharmacySettings = settingsCache;
        } catch (err) {
            console.error("Global settings error:", err);
            // Fail Closed: On DB error, assume closed to prevent operations during outage
            res.locals.pharmacySettings = { is_open: false };
        }
    }

    next();
};

// 3. Pre-warm cache on startup (optional but good practice)
invalidateSettingsCache();
// We can trigger an initial load here if DB is ready, but lazy load is safer for module import order.
