import { Router } from "express";
import { UserController } from "./user.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { updateProfileValidation } from "./user.validation";
import { upload } from "../uploads/multer";

const router = Router();

router.get(
  "/profile",
  authenticate,
  UserController.getProfile
);

router.patch(
  "/profile",
  authenticate,
  updateProfileValidation,
  validate,
  UserController.updateProfile
);

router.get(
  "/:username",
  UserController.getUserByUsername
);

router.get(
  "/",
  UserController.getAllUsers
);

router.delete(
  "/me",
  authenticate,
  UserController.deleteMyAccount
);
router.post(
  "/resume",
  authenticate,
  upload.single("resume"),
  UserController.uploadResume
);

router.post(
  "/portfolio",
  authenticate,
  upload.single("image"),
  UserController.addPortfolio
);

router.delete(
  "/portfolio/:publicId",
  authenticate,
  UserController.removePortfolio
);

export default router;