/**
 * Rate limiters for sensitive routes (beyond login/OTP which are in authRoutes).
 * Apply to profile updates, prescription uploads, orders, returns, etc.
 */
import rateLimit from "express-rate-limit";

// Profile updates, address changes, password, avatar - 10 per 15 min per IP
export const profileUpdateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: "Too many profile updates. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Prescription upload (file upload) - 5 per 15 min per IP
export const prescriptionUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: "Too many prescription uploads. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Order actions (create, cancel, calculate) - 20 per 15 min per IP
export const orderActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: "Too many order requests. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Product requests, returns - 10 per 15 min per IP
export const requestReturnLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: "Too many requests. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

// General sensitive POST (admin actions, notifications) - 30 per 15 min per IP
export const sensitivePostLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, message: "Too many requests. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});
