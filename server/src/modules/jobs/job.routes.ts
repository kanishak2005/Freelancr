import { Router } from "express";
import { JobController } from "./job.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createJobValidation,
  updateJobValidation,
} from "./job.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  createJobValidation,
  validate,
  JobController.createJob
);

router.patch(
  "/:id",
  authenticate,
  updateJobValidation,
  validate,
  JobController.updateJob
);

router.delete(
  "/:id",
  authenticate,
  JobController.deleteJob
);

router.get(
  "/my-jobs",
  authenticate,
  JobController.getMyJobs
);

router.get(
  "/search",
  JobController.searchJobs
);

router.get(
  "/filter",
  JobController.filterJobs
);

router.get(
  "/:id",
  JobController.getJob
);

router.get(
  "/",
  JobController.getAllJobs
);

export default router;