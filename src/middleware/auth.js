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

export const ensureDoctor = (req, res, next) => {
    if (req.isAuthenticated() && (req.user.role === 'pharmacist' || req.user.role === 'admin')) {
        return next();
    }
    req.flash("error", "Access denied. Doctor or Pharmacist role required.");
    res.redirect("/");
};
