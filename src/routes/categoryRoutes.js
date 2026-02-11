import express from "express";
import * as categoryController from "../controllers/categoryController.js";

const router = express.Router();

router.get("/", categoryController.getAllCategoriesPage);
router.get("/:slug", categoryController.getCategoryPage);
router.get("/:slug/products", categoryController.getMoreProducts);

export default router;
