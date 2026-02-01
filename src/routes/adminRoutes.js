import express from "express";
import { ensureAdmin } from "../middleware/auth.js";
import * as adminUsersController from "../controllers/admin/adminUsersController.js";
import * as adminHistoryController from "../controllers/admin/adminHistoryController.js";
import * as adminSettingsController from "../controllers/admin/adminSettingsController.js";
import * as adminAnalyticsController from "../controllers/admin/adminAnalyticsController.js";
import * as adminCouponsController from "../controllers/admin/adminCouponsController.js";
import * as requestController from "../controllers/requestController.js";
import * as returnController from "../controllers/returnController.js";

const router = express.Router();

// Apply ensureAdmin globally to all routes in this file
router.use(ensureAdmin);

// Dashboard Overview
router.get("/dashboard", (req, res) => res.render("admin/dashboard", { user: req.user, pageTitle: "Admin Dashboard" }));
router.get("/stats", adminAnalyticsController.getGlobalStats);

// Users Management
router.get("/users/all", adminUsersController.getUsers); // Generic users list with filters
router.get("/doctors", adminUsersController.getDoctors);
router.post("/doctors/add", adminUsersController.addDoctor);

// Coupons Management
router.get("/coupons", adminCouponsController.getCoupons);
router.post("/coupons/add", adminCouponsController.addCoupon);
router.post("/coupons/:id/toggle", adminCouponsController.toggleStatus);
router.delete("/coupons/:id", adminCouponsController.deleteCoupon);

// Product Requests 
router.get("/product-requests", requestController.getAdminRequests);
router.post("/requests/:requestId/status", requestController.updateRequestStatus);

// Returns
router.get("/returns", returnController.getAdminReturns);
router.post("/returns/process", returnController.processReturn);

// History
router.get("/history/orders", adminHistoryController.getOrdersHistory);
router.get("/history/returns", adminHistoryController.getReturnsHistory);
router.get("/history/shifts", adminHistoryController.getShiftsHistory);
router.get("/history/inventory", adminHistoryController.getInventoryHistory);

// Settings & Status
router.get("/settings", adminSettingsController.getSettings);
router.post("/settings/update", adminSettingsController.updateSettings);
router.post("/settings/toggle-status", adminSettingsController.toggleStatus);

// Audit 
router.get("/audit", (req, res) => res.render("admin/audit", { user: req.user, pageTitle: "Audit Logs" }));

export default router;
