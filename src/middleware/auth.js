import { hasRole, hasAnyRole } from '../utils/roleManager.js';
import db from '../config/dataBase.js';

export const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }

    // Check for AJAX/JSON request
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // Store the intended URL to redirect back after login
    req.session.returnTo = req.originalUrl;
    req.flash("error", "Please login to access this page.");

    req.session.save((err) => {
        if (err) console.error('Session save error:', err);
        // Pass returnTo in URL as backup
        const returnUrl = encodeURIComponent(req.originalUrl);
        res.redirect(`/?openLogin=true&returnTo=${returnUrl}`);
    });
};

export const ensureDoctor = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash("error", "Please login first.");
        const returnUrl = encodeURIComponent(req.originalUrl);
        return res.redirect(`/?openLogin=true&returnTo=${returnUrl}`);
    }

    try {
        const result = await db.query("SELECT role FROM users WHERE id = $1", [req.user.id]);
        const user = result.rows[0];

        // Allow doctors, pharmacists, and admins
        if (user && (user.role === 'doctor' || user.role === 'pharmacist' || user.role === 'admin')) {
            return next();
        }

        req.flash("error", "Access denied.");
        res.redirect("/");
    } catch (err) {
        console.error("ensureDoctor check failed:", err);
        res.status(500).render("500");
    }
};

export const ensureAdmin = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash("error", "Please login first.");
        const returnUrl = encodeURIComponent(req.originalUrl);
        return res.redirect(`/?openLogin=true&returnTo=${returnUrl}`);
    }

    try {
        // Fresh DB check for role in single-role system
        const result = await db.query("SELECT role FROM users WHERE id = $1", [req.user.id]);
        const user = result.rows[0];

        if (user && user.role === 'admin') {
            return next();
        }

        req.flash("error", "Access denied. Administrator privileges required.");
        res.redirect("/");
    } catch (err) {
        console.error("ensureAdmin check failed:", err);
        res.status(500).render("500");
    }
};
