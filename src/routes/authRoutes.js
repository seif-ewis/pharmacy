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

router.post("/login", authController.login);
router.post("/register", otpSendLimiter, authController.register);
router.post("/verify-email", otpVerifyLimiter, authController.verifyEmail);
router.get("/logout", authController.logout);

router.get("/google", authController.googleAuth);
router.get("/google/secrets", authController.googleCallback);

// Password Reset Routes
router.post("/forgot-password", otpSendLimiter, authController.forgotPassword);
router.post("/verify-reset-code", otpVerifyLimiter, authController.verifyResetCode);
router.post("/reset-password", authController.resetPassword);

export default router;
