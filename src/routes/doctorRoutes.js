import express from "express";
import { ensureDoctor } from "../middleware/auth.js";
import { sensitivePostLimiter } from "../middleware/rateLimit.js";
import * as doctorController from "../controllers/doctorController.js";
import * as announcementController from "../controllers/announcementController.js";
import * as analyticsController from "../controllers/analyticsController.js";
import * as returnController from "../controllers/returnController.js";

const router = express.Router();

// Apply ensureDoctor globally to all doctor routes
router.use(ensureDoctor);

// Dashboard & Stats
router.get("/dashboard", doctorController.getDashboard);
router.get("/dashboard/stats", doctorController.getDashboardStats);

// Orders
router.get("/orders/all", doctorController.getAllOrders);
router.get("/orders/:orderId/items", doctorController.getOrderItems);
router.post("/orders/status", sensitivePostLimiter, doctorController.updateOrderState);
router.post("/orders/create-manual", sensitivePostLimiter, doctorController.createManualOrder);

// Shifts
router.post("/shift/start", sensitivePostLimiter, doctorController.startShift);
router.post("/shift/end", sensitivePostLimiter, doctorController.endShift);
router.get("/shift/:id", doctorController.getShiftDetails);
router.get("/shift/:id/export-pdf", doctorController.exportShiftPdf);

// Pharmacy Status
router.post("/pharmacy/toggle", sensitivePostLimiter, doctorController.togglePharmacyStatus);

// Prescriptions
router.get("/prescriptions/:id/process", doctorController.getProcessPrescription);
router.post("/prescriptions/process", sensitivePostLimiter, doctorController.submitPrescriptionProcessing);
router.get("/prescriptions/:id/details", doctorController.getPrescriptionDetails);
router.get("/prescriptions/pending", doctorController.getPendingPrescriptions);
router.post("/prescriptions/decision", sensitivePostLimiter, doctorController.processPrescriptionDecision);
router.post("/prescriptions/analyze", sensitivePostLimiter, doctorController.analyzePrescriptionObject);

// Medicine Search
router.get("/medicines/search", doctorController.searchMedicines);

// Product Requests
router.get("/requests", doctorController.getProductRequests);
router.post("/requests/fulfill", sensitivePostLimiter, doctorController.fulfillProductRequest);

// Inventory CRUD
router.post("/product/ai-assist", sensitivePostLimiter, doctorController.generateProductDetails);
router.get("/inventory", doctorController.getInventory);
router.get("/inventory/most-sold", doctorController.getMostSoldThisShift);
router.post("/inventory/create", sensitivePostLimiter, doctorController.createInventoryItem);
router.put("/inventory/update/:id", sensitivePostLimiter, doctorController.updateInventoryItem);
router.delete("/inventory/delete/:id", sensitivePostLimiter, doctorController.deleteInventoryItem);
router.post("/inventory/archive/:id", sensitivePostLimiter, doctorController.toggleArchiveItem);

// Chat
router.get("/chats/active", doctorController.getChats);
router.get("/chats/:chatId/messages", doctorController.getChatMessages);
router.post("/chats/send", sensitivePostLimiter, doctorController.sendChatMessage);

// Announcements
router.post("/announcements/create", sensitivePostLimiter, announcementController.createAnnouncement);
router.get("/announcements", announcementController.getAnnouncements);

// Returns
router.get("/returns/recent", doctorController.getRecentReturns);
router.get("/returns/pending", returnController.getPendingReturns);
router.get("/returns/search-order", doctorController.searchReturnOrder);
router.get("/returns/order-items/:orderId", doctorController.getOrderItemsForReturn);
router.post("/returns/process", sensitivePostLimiter, doctorController.processReturn);
router.post("/returns/action", sensitivePostLimiter, returnController.processReturn);
router.get("/returns", doctorController.getReturnsPage);
router.post("/returns/action-inline", sensitivePostLimiter, doctorController.processReturnInline);

// Reports & Analytics
router.get("/reports/analytics", analyticsController.getDoctorAnalytics);

export default router;
