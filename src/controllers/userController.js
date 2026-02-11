import db from "../config/dataBase.js";
import bcrypt from "bcrypt";
import { formatTimeAgo } from "../utils/formatDate.js";

// Get Profile Page
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user data (already in req.user but good to be fresh)
        const userRes = await db.query("SELECT full_name, phone, email, avatar FROM users WHERE id = $1", [userId]);
        const user = userRes.rows[0];

        // Fetch addresses
        const addressRes = await db.query(
            "SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, id ASC",
            [userId]
        );
        const addresses = addressRes.rows;

        // Fetch orders (Paginated)
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const countRes = await db.query(
            "SELECT COUNT(*) FROM orders WHERE user_id = $1",
            [userId]
        );
        const totalOrders = parseInt(countRes.rows[0].count);
        const totalPages = Math.ceil(totalOrders / limit);

        const ordersRes = await db.query(
            "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            [userId, limit, offset]
        );
        const orders = ordersRes.rows;

        // Fetch prescriptions
        const presRes = await db.query(
            "SELECT * FROM prescriptions WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );
        const prescriptions = presRes.rows.map(p => ({
            ...p,
            timeAgo: formatTimeAgo(p.created_at)
        }));

        res.render("profile", {
            user,
            addresses,
            orders,
            pagination: {
                current: page,
                pages: totalPages,
                total: totalOrders
            },
            prescriptions,
            error: req.flash("error"),
            success: req.flash("success"),
        });

    } catch (err) {
        console.error("Profile error:", err);
        req.flash("error", "Failed to load profile data.");
        res.redirect("/");
    }
};

// Update Personal Info
export const updateProfile = async (req, res) => {
    const { full_name, phone } = req.body;
    try {
        await db.query(
            "UPDATE users SET full_name = $1, phone = $2 WHERE id = $3",
            [full_name, phone, req.user.id]
        );
        req.flash("success", "Profile updated successfully.");
        res.redirect("/profile");
    } catch (err) {
        console.error("Update profile error:", err);
        req.flash("error", "Failed to update profile.");
        res.redirect("/profile");
    }
};

// Add Address
export const addAddress = async (req, res) => {
    const { label, city, street, details, is_default } = req.body;
    const userId = req.user.id;

    try {
        await db.query("BEGIN");

        if (is_default === 'on') {
            await db.query("UPDATE addresses SET is_default = false WHERE user_id = $1", [userId]);
        }

        await db.query(
            "INSERT INTO addresses (user_id, label, city, street, details, is_default) VALUES ($1, $2, $3, $4, $5, $6)",
            [userId, label, city, street, details, is_default === 'on']
        );

        await db.query("COMMIT");
        await db.query("COMMIT");
        req.flash("success", "Address added successfully.");

        const redirectUrl = req.query.redirect === 'checkout' ? '/orders/checkout' : '/profile';
        res.redirect(redirectUrl);
    } catch (err) {
        await db.query("ROLLBACK");
        console.error("Add address error:", err);
        req.flash("error", "Failed to add address.");
        res.redirect("/profile");
    }
};

// Set Default Address (API)
export const setDefaultAddress = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("BEGIN");
        // Reset all
        await db.query("UPDATE addresses SET is_default = false WHERE user_id = $1", [req.user.id]);
        // Set new default
        await db.query("UPDATE addresses SET is_default = true WHERE id = $1 AND user_id = $2", [id, req.user.id]);
        await db.query("COMMIT");

        return res.json({ success: true, message: "Default address updated successfully" });
    } catch (err) {
        await db.query("ROLLBACK");
        console.error("Set default address error:", err);
        return res.status(500).json({ success: false, error: "Failed to update default address" });
    }
};

// Delete Address
export const deleteAddress = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM addresses WHERE id = $1 AND user_id = $2", [id, req.user.id]);
        req.flash("success", "Address deleted.");
        res.redirect("/profile");
    } catch (err) {
        console.error("Delete address error:", err);
        req.flash("error", "Failed to delete address.");
        res.redirect("/profile");
    }
};

// Change Password (Basic)
export const updatePassword = async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;

    if (new_password !== confirm_password) {
        req.flash("error", "New passwords do not match.");
        return res.redirect("/profile");
    }

    try {
        // Verify current
        const result = await db.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
        const match = await bcrypt.compare(current_password, result.rows[0].password_hash);

        if (!match) {
            req.flash("error", "Incorrect current password.");
            return res.redirect("/profile");
        }

        const hash = await bcrypt.hash(new_password, 10);
        await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);

        req.flash("success", "Password updated successfully.");
        res.redirect("/profile");
    } catch (err) {
        console.error("Password update error:", err);
        res.redirect("/profile");
    }
};

// Update Avatar
export const updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            req.flash("error", "No image file uploaded.");
            return res.redirect("/profile");
        }

        // Cloudinary returns the URL in req.file.path
        const avatarUrl = req.file.path;

        await db.query("UPDATE users SET avatar = $1 WHERE id = $2", [avatarUrl, req.user.id]);

        req.flash("success", "Avatar updated successfully.");
        res.redirect("/profile");
    } catch (err) {
        console.error("Avatar update error:", err);
        req.flash("error", "Failed to update avatar.");
        res.redirect("/profile");
    }
};
