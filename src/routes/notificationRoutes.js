import express from "express";
import { ensureAuthenticated } from "../middleware/auth.js";
import * as notificationController from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", notificationController.getNotifications);
router.post("/read-all", notificationController.markAllAsRead);
router.post("/:id/read", notificationController.markAsRead);
router.post("/subscribe", ensureAuthenticated, notificationController.subscribeToStock);

export default router;
