import db from "../../config/dataBase.js";

// GET: Current Settings & Status
export const getSettings = async (req, res) => {
    try {
        const settingsRes = await db.query(
            "SELECT tax_rate, delivery_fee, is_open FROM pharmacy_settings ORDER BY created_at DESC LIMIT 1"
        );

        const logsRes = await db.query(`
            SELECT psl.*, u.full_name as creator_name
            FROM pharmacy_status_logs psl
            JOIN users u ON psl.created_by = u.id
            ORDER BY psl.created_at DESC
            LIMIT 20
        `);

        res.json({
            success: true,
            settings: settingsRes.rows[0] || { tax_rate: 0.10, delivery_fee: 5.00, is_open: true },
            logs: logsRes.rows
        });
    } catch (err) {
        console.error("Get Settings Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch settings" });
    }
};

// POST: Update Settings (Versioned)
export const updateSettings = async (req, res) => {
    const { tax_rate, delivery_fee } = req.body;
    const adminId = req.user.id;

    try {
        if (tax_rate === undefined || delivery_fee === undefined) {
            return res.status(400).json({ success: false, message: "Tax rate and delivery fee are required" });
        }

        // Get current status to maintain it
        const current = await db.query("SELECT is_open FROM pharmacy_settings ORDER BY created_at DESC LIMIT 1");
        const is_open = current.rows.length > 0 ? current.rows[0].is_open : true;

        await db.query(
            "INSERT INTO pharmacy_settings (id, tax_rate, delivery_fee, is_open, modified_by, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())",
            [tax_rate, delivery_fee, is_open, adminId]
        );

        res.json({ success: true, message: "Settings updated correctly" });
    } catch (err) {
        console.error("Update Settings Error:", err);
        res.status(500).json({ success: false, message: "Failed to update settings" });
    }
};

// POST: Toggle Pharmacy Status
export const toggleStatus = async (req, res) => {
    const { is_open } = req.body;
    const adminId = req.user.id;

    try {
        // 1. Get latest financial settings to carry them over
        const latest = await db.query("SELECT tax_rate, delivery_fee FROM pharmacy_settings ORDER BY created_at DESC LIMIT 1");
        const { tax_rate, delivery_fee } = latest.rows[0] || { tax_rate: 0.10, delivery_fee: 5.00 };

        // 2. Insert new settings row with toggled status
        await db.query(
            "INSERT INTO pharmacy_settings (id, tax_rate, delivery_fee, is_open, modified_by, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())",
            [tax_rate, delivery_fee, is_open, adminId]
        );

        // 3. Log the status change
        await db.query(
            "INSERT INTO pharmacy_status_logs (id, is_open, created_by, created_at) VALUES (gen_random_uuid(), $1, $2, NOW())",
            [is_open, adminId]
        );

        res.json({ success: true, message: `Pharmacy is now ${is_open ? 'OPEN' : 'CLOSED'}` });
    } catch (err) {
        console.error("Toggle Status Error:", err);
        res.status(500).json({ success: false, message: "Failed to toggle pharmacy status" });
    }
};
