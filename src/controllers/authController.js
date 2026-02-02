import bcrypt from "bcrypt";
import crypto from "crypto";
import passport from "passport";
import db from "../config/dataBase.js";
import { sendOTP } from "../utils/emailService.js";

const saltRound = 10;
const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

export const login = (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            if (info.message === "unverified") {
                return res.status(403).json({ success: false, message: "Please verify your email address.", unverified: true, email: info.email });
            }
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(401).json({ success: false, message: info.message || "Invalid credentials" });
            }
            req.flash("error", info.message || "Invalid credentials");
            return res.redirect("/");
        }

        const returnTo = req.session.returnTo;

        req.logIn(user, (err) => {
            if (err) return next(err);
            const redirectUrl = returnTo || "/";
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true, redirectUrl });
            }
            res.redirect(redirectUrl);
        });
    })(req, res, next);
};

export const register = async (req, res) => {
    const { username, email, password, confirm_password } = req.body;

    if (!gmailRegex.test(email)) {
        return res.status(400).json({ success: false, message: "Invalid email address" });
    }

    if (password !== confirm_password) {
        return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    try {
        const hash = await bcrypt.hash(password, saltRound);
        const result = await db.query(
            "INSERT INTO users (email, password_hash, full_name, email_verified) VALUES ($1, $2, $3, FALSE) RETURNING *",
            [email.toLowerCase(), hash, username]
        );
        const userId = result.rows[0].id;
        const { assignRole } = await import("../utils/roleManager.js");
        await assignRole(userId, 'patient');

        // Generate OTP
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, saltRound);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.query(
            "INSERT INTO email_verifications (user_id, otp_hash, expires_at) VALUES ($1, $2, $3)",
            [userId, otpHash, expiresAt]
        );

        try {
            await sendOTP(email, otp, 'Email Verification');
        } catch (mailErr) {
            console.error("Mail send error:", mailErr);
        }

        res.json({ success: true, message: "Account created! Please verify your email.", verifyEmail: email });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: "Email already exists. Try logging in." });
        }
        console.error(err);
        res.status(500).json({ success: false, message: "A server error occurred." });
    }
};

export const verifyEmail = async (req, res) => {
    const { email, code } = req.body;

    try {
        const userResult = await db.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid email address" });
        }

        const userId = userResult.rows[0].id;
        const verifyResult = await db.query(
            "SELECT * FROM email_verifications WHERE user_id = $1 AND expires_at > NOW() AND verified = FALSE",
            [userId]
        );

        if (verifyResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: "OTP expired or not found" });
        }

        const record = verifyResult.rows[0];
        const isValid = await bcrypt.compare(code, record.otp_hash);

        if (!isValid) {
            return res.status(400).json({ success: false, message: "Invalid verification code" });
        }

        await db.query("UPDATE users SET email_verified = TRUE WHERE id = $1", [userId]);
        await db.query("DELETE FROM email_verifications WHERE user_id = $1", [userId]);

        res.json({ success: true, message: "Email verified successfully! You can now log in." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            req.flash("error", "Error logging out.");
            return next(err);
        }
        res.redirect("/");
    });
};

export const googleAuth = passport.authenticate("google", {
    scope: ["profile", "email"],
});

export const googleCallback = (req, res, next) => {
    passport.authenticate("google", (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.redirect("/");
        req.logIn(user, (err) => {
            if (err) return next(err);
            const redirectUrl = req.session.returnTo || "/";
            delete req.session.returnTo;
            res.redirect(redirectUrl);
        });
    })(req, res, next);
};

// Password Reset Flows

// 1. Request Password Reset
export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!gmailRegex.test(email) && email !== 'admin@hosam.com') {
        return res.status(400).json({ success: false, message: "Invalid email address" });
    }

    // Always return success to prevent email enumeration
    const successResponse = { success: true, message: "If an account exists with that email, a code has been sent." };

    try {
        const userResult = await db.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);

        if (userResult.rows.length === 0) {
            return res.json(successResponse);
        }

        const userId = userResult.rows[0].id;

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, saltRound);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete any existing reset records for this user
        await db.query("DELETE FROM password_resets WHERE user_id = $1", [userId]);

        // Store new OTP
        await db.query(
            "INSERT INTO password_resets (user_id, otp_hash, expires_at) VALUES ($1, $2, $3)",
            [userId, otpHash, expiresAt]
        );

        // Send Email
        try {
            await sendOTP(email, otp);
        } catch (mailErr) {
            console.error("Mail send error:", mailErr);
            // We still return success to the user, but log the error
        }

        res.json(successResponse);
    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// 2. Verify OTP Code
export const verifyResetCode = async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ success: false, message: "Email and code are required" });
    }

    try {
        const userResult = await db.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid email or code" });
        }

        const userId = userResult.rows[0].id;
        const resetResult = await db.query(
            "SELECT * FROM password_resets WHERE user_id = $1 AND expires_at > NOW() AND verified = FALSE",
            [userId]
        );

        if (resetResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: "OTP expired or not found" });
        }

        const resetRecord = resetResult.rows[0];

        if (resetRecord.attempts >= 5) {
            return res.status(400).json({ success: false, message: "Too many attempts. Please request a new code." });
        }

        const isValid = await bcrypt.compare(code, resetRecord.otp_hash);

        if (!isValid) {
            await db.query("UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1", [resetRecord.id]);
            return res.status(400).json({ success: false, message: "Invalid verification code" });
        }

        // Generate short-lived reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.query(
            "UPDATE password_resets SET verified = TRUE, reset_token = $1, token_expires_at = $2 WHERE id = $3",
            [resetToken, tokenExpiresAt, resetRecord.id]
        );

        res.json({ success: true, resetToken });
    } catch (err) {
        console.error("Verify code error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// 3. Reset Password
export const resetPassword = async (req, res) => {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
        return res.status(400).json({ success: false, message: "Token and new password required" });
    }

    try {
        const resetResult = await db.query(
            "SELECT * FROM password_resets WHERE reset_token = $1 AND token_expires_at > NOW() AND verified = TRUE",
            [resetToken]
        );

        if (resetResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
        }

        const resetRecord = resetResult.rows[0];
        const newHash = await bcrypt.hash(newPassword, saltRound);

        // Update password
        await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, resetRecord.user_id]);

        // Delete reset record
        await db.query("DELETE FROM password_resets WHERE id = $1", [resetRecord.id]);

        res.json({ success: true, message: "Password reset successful" });
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
