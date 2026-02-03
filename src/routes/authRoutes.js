import express from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/authController.js";

const router = express.Router();

// Rate limiters
const otpSendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    keyGenerator: (req) => req.body.email || req.ip,
    message: { success: false, message: "Too many requests. Please try again in an hour." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
});

const otpVerifyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    keyGenerator: (req) => req.body.email || req.ip,
    message: { success: false, message: "Too many verification attempts. Please try again in an hour." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
});

const resendResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3,
    keyGenerator: (req) => req.body.email || req.ip,
    message: { success: false, message: "Too many resend requests. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 failed login requests per 15 minutes
    message: { success: false, message: "Too many failed login attempts. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // This ensures it only counts non-2xx responses
});

router.post("/login", loginLimiter, authController.login);
router.post("/register", otpSendLimiter, authController.register);
router.post("/verify-email", otpVerifyLimiter, authController.verifyEmail);
router.get("/logout", authController.logout);

router.get("/google", authController.googleAuth);
router.get("/google/secrets", authController.googleCallback);

// Password Reset Routes
router.post("/forgot-password", otpSendLimiter, authController.forgotPassword);
router.post("/resend-reset-code", resendResetLimiter, authController.resendResetCode);
router.post("/verify-reset-code", otpVerifyLimiter, authController.verifyResetCode);
router.post("/reset-password", authController.resetPassword);

export default router;
