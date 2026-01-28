import db from "../config/dataBase.js";

// GET: Render Settings Page
export const getSettings = async (req, res) => {
    try {
        const result = await db.query(
            "SELECT tax_rate, delivery_fee FROM pharmacy_settings ORDER BY created_at DESC LIMIT 1"
        );
        const settings = result.rows[0] || { tax_rate: 0.10, delivery_fee: 5.00 };

        // Ensure only admin or pharmacist? Access control handled by route middleware
        res.render("admin/settings", {
            settings,
            user: req.user,
            pageTitle: "Pharmacy Settings"
        });
    } catch (err) {
        console.error("Get Settings Error:", err);
        res.status(500).render("500");
    }
};

// POST: Update Settings
export const updateSettings = async (req, res) => {
    try {
        const { tax_rate, delivery_fee } = req.body;
        const adminId = req.user.id;

        // INSERT new log entry with updated settings
        await db.query(
            "INSERT INTO pharmacy_settings (id, tax_rate, delivery_fee, modified_by, created_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW())",
            [tax_rate, delivery_fee, adminId]
        );

        res.json({ success: true, message: "Settings updated successfully" });
    } catch (err) {
        console.error("Update Settings Error:", err);
        res.status(500).json({ success: false, message: "Failed to update settings" });
    }
};
