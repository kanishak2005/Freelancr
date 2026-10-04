import { Router } from "express";

import { AdminController } from "./admin.controller";
import {
  adminUserIdValidation,
  adminJobIdValidation,
  updateUserStatusValidation,
  updateUserVerificationValidation,
  updateJobStatusValidation,
  adminUsersQueryValidation,
  adminJobsQueryValidation,
} from "./admin.validation";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();

router.use(
  authenticate,
  authorize("admin")
);

// Dashboard

router.get(
  "/dashboard",
  AdminController.getDashboard
);

// Users

router.get(
  "/users",
  adminUsersQueryValidation,
  validate,
  AdminController.getUsers
);

router.get(
  "/users/:id",
  adminUserIdValidation,
  validate,
  AdminController.getUser
);

router.patch(
  "/users/:id/status",
  updateUserStatusValidation,
  validate,
  AdminController.updateUserStatus
);

router.patch(
  "/users/:id/verify",
  updateUserVerificationValidation,
  validate,
  AdminController.verifyUser
);

router.delete(
  "/users/:id",
  adminUserIdValidation,
  validate,
  AdminController.deleteUser
);

// Jobs

router.get(
  "/jobs",
  adminJobsQueryValidation,
  validate,
  AdminController.getJobs
);

router.patch(
  "/jobs/:id/status",
  updateJobStatusValidation,
  validate,
  AdminController.updateJobStatus
);

router.delete(
  "/jobs/:id",
  adminJobIdValidation,
  validate,
  AdminController.deleteJob
);

export default router;
