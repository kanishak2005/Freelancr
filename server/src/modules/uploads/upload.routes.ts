import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { uploadRateLimiter } from "../../middleware/rateLimit.middleware";
import { upload } from "./multer";
import { UploadController } from "./upload.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  uploadRateLimiter,
  upload.single("file"),
  UploadController.upload
);

router.delete(
  "/:publicId",
  authenticate,
  UploadController.delete
);

export default router;