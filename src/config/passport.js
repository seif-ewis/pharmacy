import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import db from "../config/dataBase.js";
import dotenv from "dotenv";

dotenv.config();

// Local Strategy
passport.use(
    "local",                                      // cb callback function
    new LocalStrategy({ usernameField: 'email' }, async function verify(email, password, cb) {
        console.log("Attempting login for:", email);
        try {
            const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
                email.toLowerCase(),
            ]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                const storedHashedPassword = user.password_hash;
                bcrypt.compare(password, storedHashedPassword, (err, result) => {
                    if (err) {
                        //Error with password check
                        console.error("Error comparing passwords:", err);
                        return cb(err);
                    } else {
                        if (result) {
                            //Passed password check
                            if (user.email_verified === false) {
                                return cb(null, false, { message: "unverified", email: user.email });
                            }
                            return cb(null, user);
                        } else {
                            //Did not pass password check
                            return cb(null, false, { message: "Incorrect password" });
                        }
                    }
                });
            } else {
                return cb(null, false, { message: "User not found" });
            }
        } catch (err) {
            console.log(err);
            return cb(err);
        }
    })
);


// Google Strategy
passport.use(
    "google",
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3001/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    }, async (accessToken, refreshToken, profile, cb) => {
        try {
            const result = await db.query("SELECT * FROM users WHERE email = $1", [profile.emails[0].value.toLowerCase()]);
            if (result.rows.length === 0) {
                // If user doesn't exist, you might want to create one
                // Using a placeholder password as suggested by your previous diff
                const newUser = await db.query(
                    "INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING *",
                    [profile.emails[0].value.toLowerCase(), "google", profile.displayName]
                );
                const { assignRole } = await import("../utils/roleManager.js");
                await assignRole(newUser.rows[0].id, 'patient');

                return cb(null, newUser.rows[0]);
            } else {
                return cb(null, result.rows[0]);
            }
        } catch (err) {
            return cb(err);
        }
    })
);

passport.serializeUser((user, cb) => {
    cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        const user = result.rows[0];
        if (user) {
            const { getUserRoles } = await import("../utils/roleManager.js");
            user.roles = await getUserRoles(user.id);
        }
        cb(null, user);
    } catch (err) {
        cb(err);
    }
});

export default passport;