import { Router } from "express";
import { AuthController } from "./auth.controller";
import {
  registerValidation,
  loginValidation,
} from "./auth.validation";
import { validate } from "../../middleware/validate.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { changePasswordValidation } from "./auth.validation";
import {
  forgotPasswordValidation,
  resetPasswordValidation,
} from "./auth.validation";

const router = Router();

router.post(
  "/register",
  registerValidation,
  validate,
  AuthController.register
);

router.post(
  "/login",
  loginValidation,
  validate,
  AuthController.login
);
router.get(
  "/me",
  authenticate,
  AuthController.me
);
router.post(
  "/logout",
  authenticate,
  AuthController.logout
);
router.post(
  "/refresh",
  AuthController.refresh
);
router.patch(
  "/change-password",
  authenticate,
  changePasswordValidation,
  validate,
  AuthController.changePassword
);
router.post(
  "/forgot-password",
  forgotPasswordValidation,
  validate,
  AuthController.forgotPassword
);

router.post(
  "/reset-password",
  resetPasswordValidation,
  validate,
  AuthController.resetPassword
);
export default router;