import express from "express";
import { ensureAuthenticated } from "../middleware/auth.js";
import { profileUpdateLimiter } from "../middleware/rateLimit.js";
import { upload } from "../config/cloudinary.js";
import * as userController from "../controllers/userController.js";

const router = express.Router();

router.get("/", ensureAuthenticated, userController.getProfile);
router.post("/update", profileUpdateLimiter, ensureAuthenticated, userController.updateProfile);
router.post("/address/add", profileUpdateLimiter, ensureAuthenticated, userController.addAddress);
router.post("/address/:id/default", profileUpdateLimiter, ensureAuthenticated, userController.setDefaultAddress);
router.post("/address/:id/delete", profileUpdateLimiter, ensureAuthenticated, userController.deleteAddress);
router.post("/password", profileUpdateLimiter, ensureAuthenticated, userController.updatePassword);
router.post("/avatar", profileUpdateLimiter, ensureAuthenticated, upload.single("avatar"), userController.updateAvatar);

export default router;
