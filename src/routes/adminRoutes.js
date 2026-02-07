import express from "express";
import { ensureAdmin } from "../middleware/auth.js";
import { sensitivePostLimiter } from "../middleware/rateLimit.js";
import * as adminUsersController from "../controllers/admin/adminUsersController.js";
import * as adminHistoryController from "../controllers/admin/adminHistoryController.js";
import * as adminSettingsController from "../controllers/admin/adminSettingsController.js";
import * as adminAnalyticsController from "../controllers/admin/adminAnalyticsController.js";
import * as adminCouponsController from "../controllers/admin/adminCouponsController.js";
import * as adminModuleController from "../controllers/admin/adminModuleController.js";
import * as adminInventoryController from "../controllers/admin/adminInventoryController.js";
import * as adminPrescriptionsController from "../controllers/admin/adminPrescriptionsController.js";
import * as adminAuditController from "../controllers/admin/adminAuditController.js";
import * as announcementController from "../controllers/announcementController.js";

const router = express.Router();

// Apply ensureAdmin globally to all routes in this file
router.use(ensureAdmin);

// Rate limit all admin POST/DELETE actions (30 per 15 min per IP)
const adminActionLimiter = sensitivePostLimiter;

// Dashboard Core & Dynamic Modules
router.get("/dashboard", (req, res) => res.render("admin/dashboard", { user: req.user, pageTitle: "Admin Dashboard" }));
router.get("/module/:name", adminModuleController.getModulePartial);
router.get("/stats", adminAnalyticsController.getGlobalStats);
router.get("/summary", adminAnalyticsController.getDashboardSummary);
router.get("/analytics/detailed", adminAnalyticsController.getDetailedAnalytics);
router.get("/performance-ledger", adminAnalyticsController.getPerformanceLedger);

// Users (Patients) Management
router.get("/users/all", adminUsersController.getUsers);
router.get("/doctors", adminUsersController.getDoctors);
router.post("/doctors/add", adminActionLimiter, adminUsersController.addDoctor);

// Inventory Control
router.get("/inventory", adminInventoryController.getInventory);
router.get("/inventory/logs", adminInventoryController.getInventoryLogs);
router.post("/inventory/adjust", adminActionLimiter, adminInventoryController.adjustStock);

// Prescriptions
router.get("/prescriptions", adminPrescriptionsController.getPrescriptions);
router.get("/prescriptions/:id", adminPrescriptionsController.getPrescriptionDetails);
router.post("/prescriptions/:id/process", adminActionLimiter, adminPrescriptionsController.processPrescription);

// History & Logs
router.get("/history/orders", adminHistoryController.getOrdersHistory);
router.get("/history/orders/:id", adminHistoryController.getOrderDetails);
router.get("/history/shifts", adminHistoryController.getShiftsHistory);
router.get("/history/shifts/:id", adminHistoryController.getShiftDetails);
router.get("/history/returns", adminHistoryController.getReturnsHistory);
router.get("/history/inventory", adminHistoryController.getInventoryHistory);
router.get("/history/doctor-shifts/:id", adminHistoryController.getDoctorShifts);
router.get("/history/user-orders/:id", adminHistoryController.getUserOrders);
router.get("/audit/logs", adminAuditController.getAuditLogs);
router.get("/audit/details/:id", adminAuditController.getAuditDetails);

// Promotions & Coupons
router.get("/coupons", adminCouponsController.getCoupons);
router.post("/coupons/add", adminActionLimiter, adminCouponsController.addCoupon);
router.post("/coupons/:id/toggle", adminActionLimiter, adminCouponsController.toggleStatus);
router.delete("/coupons/:id", adminActionLimiter, adminCouponsController.deleteCoupon);
router.post("/coupons/:id/toggle-featured", adminActionLimiter, adminCouponsController.toggleFeatured);

// System Settings
router.get("/settings", adminSettingsController.getSettings);
router.post("/settings/update", adminActionLimiter, adminSettingsController.updateSettings);
router.post("/settings/toggle-status", adminActionLimiter, adminSettingsController.toggleStatus);

// Announcements
router.get("/announcements", announcementController.getAnnouncements);
router.post("/announcements/create", adminActionLimiter, announcementController.createAnnouncement);

export default router;
