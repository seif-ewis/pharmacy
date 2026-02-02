import express from "express";
import { ensureAdmin } from "../middleware/auth.js";
import * as adminUsersController from "../controllers/admin/adminUsersController.js";
import * as adminHistoryController from "../controllers/admin/adminHistoryController.js";
import * as adminSettingsController from "../controllers/admin/adminSettingsController.js";
import * as adminAnalyticsController from "../controllers/admin/adminAnalyticsController.js";
import * as adminCouponsController from "../controllers/admin/adminCouponsController.js";
import * as adminModuleController from "../controllers/admin/adminModuleController.js";
import * as adminInventoryController from "../controllers/admin/adminInventoryController.js";
import * as adminPrescriptionsController from "../controllers/admin/adminPrescriptionsController.js";
import * as adminAuditController from "../controllers/admin/adminAuditController.js";

const router = express.Router();

// Apply ensureAdmin globally to all routes in this file
router.use(ensureAdmin);

// Dashboard Core & Dynamic Modules
router.get("/dashboard", (req, res) => res.render("admin/dashboard", { user: req.user, pageTitle: "Admin Dashboard" }));
router.get("/module/:name", adminModuleController.getModulePartial);
router.get("/stats", adminAnalyticsController.getGlobalStats);
router.get("/summary", adminAnalyticsController.getDashboardSummary);
router.get("/analytics/detailed", adminAnalyticsController.getDetailedAnalytics);

// Users (Patients) Management
router.get("/users/all", adminUsersController.getUsers);
router.get("/doctors", adminUsersController.getDoctors);
router.post("/doctors/add", adminUsersController.addDoctor);

// Inventory Control
router.get("/inventory", adminInventoryController.getInventory);
router.get("/inventory/logs", adminInventoryController.getInventoryLogs);
router.post("/inventory/adjust", adminInventoryController.adjustStock);

// Prescriptions
router.get("/prescriptions", adminPrescriptionsController.getPrescriptions);
router.get("/prescriptions/:id", adminPrescriptionsController.getPrescriptionDetails);
router.post("/prescriptions/:id/process", adminPrescriptionsController.processPrescription);

// History & Logs
router.get("/history/orders", adminHistoryController.getOrdersHistory);
router.get("/history/orders/:id", adminHistoryController.getOrderDetails);
router.get("/history/shifts", adminHistoryController.getShiftsHistory);
router.get("/history/shifts/:id", adminHistoryController.getShiftDetails);
router.get("/history/returns", adminHistoryController.getReturnsHistory);
router.get("/history/inventory", adminHistoryController.getInventoryHistory);
router.get("/audit/logs", adminAuditController.getAuditLogs);

// Promotions & Coupons
router.get("/coupons", adminCouponsController.getCoupons);
router.post("/coupons/add", adminCouponsController.addCoupon);
router.post("/coupons/:id/toggle", adminCouponsController.toggleStatus);
router.delete("/coupons/:id", adminCouponsController.deleteCoupon);

// System Settings
router.get("/settings", adminSettingsController.getSettings);
router.post("/settings/update", adminSettingsController.updateSettings);
router.post("/settings/toggle-status", adminSettingsController.toggleStatus);

export default router;
