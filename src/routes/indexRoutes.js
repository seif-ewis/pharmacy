import express from "express";
import * as homeController from "../controllers/homeController.js";
import * as searchController from "../controllers/searchController.js";
import * as notificationController from "../controllers/notificationController.js";
import * as orderController from "../controllers/orderController.js";
import * as requestController from "../controllers/requestController.js";
import * as prescriptionController from "../controllers/prescriptionController.js";
import { upload } from "../config/cloudinary.js";
import * as returnController from "../controllers/returnController.js";
import * as userController from "../controllers/userController.js";
import * as productController from "../controllers/productController.js";
import * as doctorController from "../controllers/doctorController.js";
import * as adminController from "../controllers/adminController.js";
import * as announcementController from "../controllers/announcementController.js";
import * as analyticsController from "../controllers/analyticsController.js";
import * as categoryController from "../controllers/categoryController.js";

import { ensureAuthenticated, ensureDoctor, ensureAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", homeController.getHomePage);
router.get("/category/:slug", categoryController.getCategoryPage);
router.get("/api/category/:slug/products", categoryController.getMoreProducts);
router.get("/search", searchController.searchMedicines);
router.get("/notifications", notificationController.getNotifications);
router.post("/notifications/read-all", notificationController.markAllAsRead);
router.post("/notifications/:id/read", notificationController.markAsRead);
router.post("/notifications/subscribe", ensureAuthenticated, notificationController.subscribeToStock);

// Protected prescription upload route (Server-side check)
// Prescription Routes

router.get("/prescription/upload", ensureAuthenticated, prescriptionController.getUploadPage);
router.post("/prescription/upload", ensureAuthenticated, upload.single("image"), prescriptionController.uploadPrescription);
router.get("/prescription/:id", ensureAuthenticated, prescriptionController.getPrescriptionDetails);

// Order Routes
router.get("/checkout", ensureAuthenticated, orderController.getCheckoutPage);
router.get("/orders", ensureAuthenticated, orderController.getOrders);
router.post("/orders/calculate", ensureAuthenticated, orderController.calculateOrder);
router.post("/orders/checkout", ensureAuthenticated, orderController.createOrder);

// Order Management Routes
router.get("/orders/:id", ensureAuthenticated, orderController.getOrderDetails);
router.post("/orders/:id/cancel", ensureAuthenticated, orderController.cancelOrder);

// Product Request Routes
router.get("/orders/request/new", ensureAuthenticated, (req, res) => res.render("orders/request", { user: req.user, pageTitle: "Request Product" }));
router.post("/orders/request", ensureAuthenticated, requestController.submitRequest);
router.get("/orders/requests/me", ensureAuthenticated, requestController.getUserRequests);
router.post("/orders/request/:requestId/confirm", ensureAuthenticated, requestController.confirmReadyRequest);

// Admin Product Request Routes
router.get("/admin/product-requests", ensureAuthenticated, requestController.getAdminRequests);
router.post("/admin/requests/:requestId/status", ensureAuthenticated, requestController.updateRequestStatus);

// Return Routes (User)
router.get("/orders/:orderId/return", ensureAuthenticated, returnController.getReturnPage);
router.post("/orders/return", ensureAuthenticated, returnController.submitReturnRequest);

// Return Routes (Admin)
// TODO: Add ensureAdmin middleware later. For now using ensureAuthenticated.
router.get("/admin/returns", ensureAuthenticated, returnController.getAdminReturns);
router.post("/admin/returns/process", ensureAuthenticated, returnController.processReturn);

// Profile

// Protected profile routes
router.get("/profile", ensureAuthenticated, userController.getProfile);
router.post("/profile/update", ensureAuthenticated, userController.updateProfile);
router.post("/profile/address/add", ensureAuthenticated, userController.addAddress);
router.post("/profile/address/:id/default", ensureAuthenticated, userController.setDefaultAddress);
router.post("/profile/address/:id/delete", ensureAuthenticated, userController.deleteAddress);
router.post("/profile/password", ensureAuthenticated, userController.updatePassword);
router.post("/profile/avatar", ensureAuthenticated, upload.single("avatar"), userController.updateAvatar);

router.get("/privacy-policy", (req, res) => {
    res.render("privacyPolicy");
});

router.get("/terms", (req, res) => {
    res.render("termOfUse");
});

router.get("/return-policy", (req, res) => {
    res.render("returnPolicy");
});

// Products
router.get("/products/:id", productController.getProductDetails);

// Doctor Dashboard Routes

router.get("/doctor/dashboard", ensureDoctor, doctorController.getDashboard);
router.get("/doctor/dashboard/stats", ensureDoctor, doctorController.getDashboardStats);
router.get("/doctor/orders/all", ensureDoctor, doctorController.getAllOrders);
router.get("/doctor/orders/:orderId/items", ensureDoctor, doctorController.getOrderItems);
router.post("/doctor/shift/start", ensureDoctor, doctorController.startShift);
router.post("/doctor/shift/end", ensureDoctor, doctorController.endShift);
router.get("/doctor/shift/:id", ensureDoctor, doctorController.getShiftDetails);
router.get("/doctor/shift/:id/export-pdf", ensureDoctor, doctorController.exportShiftPdf);
router.post("/doctor/pharmacy/toggle", ensureDoctor, doctorController.togglePharmacyStatus);

// Admin Settings Routes (Admin Only)
router.get("/admin/settings", ensureAdmin, adminController.getSettings);
router.post("/admin/settings/update", ensureAdmin, adminController.updateSettings);
router.get("/admin/audit", ensureAdmin, adminController.getAuditLogs);

router.get("/doctor/prescriptions/:id/process", ensureDoctor, doctorController.getProcessPrescription);
router.post("/doctor/prescriptions/process", ensureDoctor, doctorController.submitPrescriptionProcessing);

// New Prescription Modal Routes
router.get("/doctor/prescriptions/:id/details", ensureDoctor, doctorController.getPrescriptionDetails);
router.get("/doctor/medicines/search", ensureDoctor, doctorController.searchMedicines);
router.post("/doctor/prescriptions/decision", ensureDoctor, doctorController.processPrescriptionDecision);
router.post("/doctor/prescriptions/analyze", ensureDoctor, doctorController.analyzePrescriptionObject);
router.get("/doctor/prescriptions/pending", ensureDoctor, doctorController.getPendingPrescriptions);
router.post("/doctor/orders/status", ensureDoctor, doctorController.updateOrderState);
// Product Request Routes (Doctor Dashboard)
router.get("/doctor/requests", ensureDoctor, doctorController.getProductRequests);
router.post("/doctor/requests/fulfill", ensureDoctor, doctorController.fulfillProductRequest);

// Doctor Inventory Routes (CRUD)
router.post("/doctor/product/ai-assist", ensureDoctor, doctorController.generateProductDetails);
router.get("/doctor/inventory", ensureDoctor, doctorController.getInventory);
router.get("/doctor/inventory/most-sold", ensureDoctor, doctorController.getMostSoldThisShift);
router.post("/doctor/inventory/create", ensureDoctor, doctorController.createInventoryItem);
router.put("/doctor/inventory/update/:id", ensureDoctor, doctorController.updateInventoryItem);
router.delete("/doctor/inventory/delete/:id", ensureDoctor, doctorController.deleteInventoryItem);

// Doctor Chat Routes
router.get("/doctor/chats/active", ensureDoctor, doctorController.getChats);
router.get("/doctor/chats/:chatId/messages", ensureDoctor, doctorController.getChatMessages);
// Doctor Announcement Routes
router.post("/doctor/announcements/create", ensureDoctor, announcementController.createAnnouncement);
router.get("/doctor/announcements", ensureDoctor, announcementController.getAnnouncements);
router.post("/doctor/chats/send", ensureDoctor, doctorController.sendChatMessage);

// Doctor Returns Module Routes
router.get("/doctor/returns/recent", ensureDoctor, doctorController.getRecentReturns);
router.get("/doctor/returns/pending", ensureDoctor, returnController.getPendingReturns);
router.get("/doctor/returns/search-order", ensureDoctor, doctorController.searchReturnOrder);
router.get("/doctor/returns/order-items/:orderId", ensureDoctor, doctorController.getOrderItemsForReturn);
router.post("/doctor/returns/process", ensureDoctor, doctorController.processReturn);
router.post("/doctor/returns/action", ensureDoctor, returnController.processReturn); // For approving/rejecting requests
router.get("/doctor/returns", ensureDoctor, doctorController.getReturnsPage); // Full Returns Page
router.post("/doctor/returns/action-inline", ensureDoctor, doctorController.processReturnInline); // Inline Dashboard Action

// Doctor Reports Analytics
router.get("/doctor/reports/analytics", ensureDoctor, analyticsController.getDoctorAnalytics);



export default router;
