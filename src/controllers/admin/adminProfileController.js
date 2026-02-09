import db from "../../config/dataBase.js";
import bcrypt from "bcrypt";

// Get Profile Page - redirect to dashboard
export const getProfile = async (req, res) => {
    res.redirect("/admin/dashboard#profile");
};

// Update Profile
export const updateProfile = async (req, res) => {
    const { full_name, email, current_password, new_password, confirm_password } = req.body;
    const userId = req.user.id;

    try {
        // 1. Verify Current Password
        const userRes = await db.query("SELECT password_hash, email FROM users WHERE id = $1", [userId]);
        const user = userRes.rows[0];

        if (!user) {
            req.flash("error", "User not found.");
            return res.redirect("/admin/profile");
        }

        const isMatch = await bcrypt.compare(current_password, user.password_hash);
        if (!isMatch) {
            if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                return res.status(400).json({ success: false, message: "Incorrect current password." });
            }
            req.flash("error", "Incorrect current password.");
            return res.redirect("/admin/dashboard#profile");
        }

        // 2. Check if email is being changed and if it's already in use
        if (email && email !== user.email) {
            const emailCheck = await db.query("SELECT id FROM users WHERE email = $1 AND id != $2", [email, userId]);
            if (emailCheck.rows.length > 0) {
                if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                    return res.status(400).json({ success: false, message: "Email is already in use." });
                }
                req.flash("error", "Email is already in use.");
                return res.redirect("/admin/dashboard#profile");
            }
        }

        // 3. Prepare Updates
        if (new_password) {
            if (new_password !== confirm_password) {
                if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                    return res.status(400).json({ success: false, message: "New passwords do not match." });
                }
                req.flash("error", "New passwords do not match.");
                return res.redirect("/admin/dashboard#profile");
            }
            if (new_password.length < 6) {
                if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                    return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
                }
                req.flash("error", "Password must be at least 6 characters.");
                return res.redirect("/admin/dashboard#profile");
            }

            const hashedPassword = await bcrypt.hash(new_password, 10);
            await db.query("UPDATE users SET full_name = $1, email = $2, password_hash = $3 WHERE id = $4", [full_name, email, hashedPassword, userId]);
        } else {
            // Just update name and email
            await db.query("UPDATE users SET full_name = $1, email = $2 WHERE id = $3", [full_name, email, userId]);
        }

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.json({ success: true, message: "Profile updated successfully." });
        }

        req.flash("success", "Profile updated successfully.");
        res.redirect("/admin/dashboard#profile");

    } catch (err) {
        console.error("Error updating profile:", err);
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(500).json({ success: false, message: err.message || "Failed to update profile." });
        }
        req.flash("error", "Failed to update profile.");
        res.redirect("/admin/dashboard#profile");
    }
};
