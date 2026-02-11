import express from "express";
import { ensureAuthenticated } from "../middleware/auth.js";
import { orderActionLimiter, requestReturnLimiter } from "../middleware/rateLimit.js";
import * as orderController from "../controllers/orderController.js";
import * as requestController from "../controllers/requestController.js";
import * as returnController from "../controllers/returnController.js";

const router = express.Router();

// Checkout & Order Creation
router.get("/checkout", ensureAuthenticated, orderController.getCheckoutPage);
router.get("/", ensureAuthenticated, orderController.getOrders);
router.post("/calculate", orderActionLimiter, ensureAuthenticated, orderController.calculateOrder);
router.post("/checkout", orderActionLimiter, ensureAuthenticated, orderController.createOrder);

// Order Details & Cancellation
router.get("/:id", ensureAuthenticated, orderController.getOrderDetails);
router.post("/:id/cancel", orderActionLimiter, ensureAuthenticated, orderController.cancelOrder);

// Product Requests
router.get("/request/new", ensureAuthenticated, (req, res) => res.render("orders/request", { user: req.user, pageTitle: "Request Product" }));
router.post("/request", requestReturnLimiter, ensureAuthenticated, requestController.submitRequest);
router.get("/requests/me", ensureAuthenticated, requestController.getUserRequests);
router.post("/request/:requestId/confirm", requestReturnLimiter, ensureAuthenticated, requestController.confirmReadyRequest);

// Returns (User)
router.get("/:orderId/return", ensureAuthenticated, returnController.getReturnPage);
router.post("/return", requestReturnLimiter, ensureAuthenticated, returnController.submitReturnRequest);

export default router;
