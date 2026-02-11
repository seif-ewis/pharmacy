import express from "express";
import { ensureAuthenticated } from "../middleware/auth.js";
import { prescriptionUploadLimiter } from "../middleware/rateLimit.js";
import { upload } from "../config/cloudinary.js";
import * as prescriptionController from "../controllers/prescriptionController.js";

const router = express.Router();

router.get("/upload", ensureAuthenticated, prescriptionController.getUploadPage);
router.post("/upload", prescriptionUploadLimiter, ensureAuthenticated, upload.single("image"), prescriptionController.uploadPrescription);
router.get("/:id", ensureAuthenticated, prescriptionController.getPrescriptionDetails);

export default router;
