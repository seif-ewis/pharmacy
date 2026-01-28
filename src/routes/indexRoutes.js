import express from "express";
import * as homeController from "../controllers/homeController.js";
import * as searchController from "../controllers/searchController.js";
import * as notificationController from "../controllers/notificationController.js";
import * as orderController from "../controllers/orderController.js";
import * as requestController from "../controllers/requestController.js";

import { ensureAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/", homeController.getHomePage);
router.get("/search", searchController.searchMedicines);
router.get("/notifications", notificationController.getNotifications);
router.post("/notifications/read-all", notificationController.markAllAsRead);
router.post("/notifications/:id/read", notificationController.markAsRead);
router.post("/notifications/subscribe", ensureAuthenticated, notificationController.subscribeToStock);

// Protected prescription upload route (Server-side check)
// Prescription Routes
import * as prescriptionController from "../controllers/prescriptionController.js";
import { upload } from "../config/cloudinary.js";

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
import * as returnController from "../controllers/returnController.js";
router.get("/orders/:orderId/return", ensureAuthenticated, returnController.getReturnPage);
router.post("/orders/return", ensureAuthenticated, returnController.submitReturnRequest);

// Return Routes (Admin)
// TODO: Add ensureAdmin middleware later. For now using ensureAuthenticated.
router.get("/admin/returns", ensureAuthenticated, returnController.getAdminReturns);
router.post("/admin/returns/process", ensureAuthenticated, returnController.processReturn);

// Profile
import * as userController from "../controllers/userController.js";

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
import * as productController from "../controllers/productController.js";
router.get("/products/:id", productController.getProductDetails);

export default router;
