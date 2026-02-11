import express from "express";
import * as homeController from "../controllers/homeController.js";
import * as searchController from "../controllers/searchController.js";

import adminRoutes from "./adminRoutes.js";
import doctorRoutes from "./doctorRoutes.js";
import orderRoutes from "./orderRoutes.js";
import profileRoutes from "./profileRoutes.js";
import prescriptionRoutes from "./prescriptionRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import productRoutes from "./productRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import staticRoutes from "./staticRoutes.js";

const router = express.Router();

// ── Public Pages ──────────────────────────────────────
router.get("/", homeController.getHomePage);
router.get("/search", searchController.searchMedicines);

// ── Mounted Sub-Routers ──────────────────────────────
router.use("/admin", adminRoutes);
router.use("/doctor", doctorRoutes);
router.use("/orders", orderRoutes);
router.use("/profile", profileRoutes);
router.use("/prescription", prescriptionRoutes);
router.use("/notifications", notificationRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/api/category", categoryRoutes);   // Preserves /api/category/:slug/products
router.use("/", staticRoutes);

export default router;
