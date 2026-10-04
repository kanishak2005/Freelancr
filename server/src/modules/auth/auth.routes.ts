import { Router } from "express";
import { AuthController } from "./auth.controller";

import {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from "./auth.validation";

import { validate } from "../../middleware/validate.middleware";
import { authenticate } from "../../middleware/auth.middleware";

import {
  authRateLimiter,
  passwordResetRateLimiter,
} from "../../middleware/rateLimit.middleware";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  registerValidation,
  validate,
  AuthController.register
);

router.post(
  "/login",
  authRateLimiter,
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
  passwordResetRateLimiter,
  forgotPasswordValidation,
  validate,
  AuthController.forgotPassword
);

router.post(
  "/reset-password",
  passwordResetRateLimiter,
  resetPasswordValidation,
  validate,
  AuthController.resetPassword
);

export default router;
