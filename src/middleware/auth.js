import { hasRole, hasAnyRole } from '../utils/roleManager.js';

export const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
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
        req.flash("error", "Please login first.");
        return res.redirect("/");
    }

    // Check new roles system
    if (req.user.roles && (req.user.roles.includes('pharmacist') || req.user.roles.includes('admin') || req.user.roles.includes('doctor'))) {
        return next();
    }

    req.flash("error", "Access denied. Doctor or Pharmacist role required.");
    res.redirect("/");
};

export const ensureAdmin = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "Please login first.");
        return res.redirect("/");
    }

    // Check new roles system
    if (req.user.roles && req.user.roles.includes('admin')) {
        return next();
    }

    req.flash("error", "Access denied. Administrator privileges required.");
    res.redirect("/");
};
