import express from "express";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.post("/login", authController.login);
router.post("/register", authController.register);
router.get("/logout", authController.logout);

router.get("/google", authController.googleAuth);
router.get("/google/secrets", authController.googleCallback);

export default router;
