import bcrypt from "bcrypt";
import passport from "passport";
import db from "../config/dataBase.js";

const saltRound = 10;

export const login = (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: false, message: info.message || "Invalid credentials" });
            }
            req.flash("error", info.message || "Invalid credentials");
            return res.redirect("/");
        }

        // Capture destination BEFORE session regeneration
        const returnTo = req.session.returnTo;

        req.logIn(user, (err) => {
            if (err) return next(err);

            // Use the captured variable, as req.session.returnTo is now lost/undefined
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

    if (password !== confirm_password) {
        req.flash("error", "Passwords do not match.");
        return res.redirect("/");
    }

    try {
        const hash = await bcrypt.hash(password, saltRound);
        const result = await db.query(
            "INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING *",
            [email.toLowerCase(), hash, username]
        );
        const { assignRole } = await import("../utils/roleManager.js");
        await assignRole(result.rows[0].id, 'patient');
        const user = result.rows[0];
        req.login(user, (err) => {
            if (err) {
                console.error(err);
                req.flash("error", "Error logging in after registration.");
                return res.redirect("/");
            }
            req.flash("success", "Account created successfully!");
            const redirectUrl = req.session.returnTo || "/";
            delete req.session.returnTo;
            res.redirect(redirectUrl);
        });
    } catch (err) {
        if (err.code === '23505') {
            req.flash("error", "Email already exists. Try logging in.");
            return res.redirect("/");
        }
        console.error(err);
        req.flash("error", "A server error occurred.");
        res.redirect("/");
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
