import { Router } from "express";

import { AdminController } from "./admin.controller";

import { authenticate } from "../../middleware/auth.middleware";

import { authorize } from "../../middleware/authorize.middleware";

const router = Router();


// All admin routes require authentication
// and admin role.

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
  AdminController.getUsers
);

router.get(
  "/users/:id",
  AdminController.getUser
);

router.patch(
  "/users/:id/status",
  AdminController.updateUserStatus
);

router.patch(
  "/users/:id/verify",
  AdminController.verifyUser
);

router.delete(
  "/users/:id",
  AdminController.deleteUser
);


// Jobs

router.get(
  "/jobs",
  AdminController.getJobs
);

router.patch(
  "/jobs/:id/status",
  AdminController.updateJobStatus
);

router.delete(
  "/jobs/:id",
  AdminController.deleteJob
);


export default router;