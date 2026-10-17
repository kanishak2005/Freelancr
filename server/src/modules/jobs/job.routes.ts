import { Router } from "express";
import { JobController } from "./job.controller";
import { authenticate, optionalAuthenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { validate } from "../../middleware/validate.middleware";
import { searchRateLimiter } from "../../middleware/rateLimit.middleware";
import {
  createJobValidation,
  updateJobValidation,
  jobIdValidation,
  searchJobValidation,
  filterJobsValidation,
} from "./job.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("client"),
  createJobValidation,
  validate,
  JobController.createJob
);

router.get(
  "/saved",
  authenticate,
  JobController.getSavedJobs
);

router.post(
  "/:id/save",
  authenticate,
  jobIdValidation,
  validate,
  JobController.saveJob
);

router.delete(
  "/:id/save",
  authenticate,
  jobIdValidation,
  validate,
  JobController.unsaveJob
);

router.patch(
  "/:id",
  authenticate,
  authorize("client"),
  jobIdValidation,
  updateJobValidation,
  validate,
  JobController.updateJob
);

router.delete(
  "/:id",
  authenticate,
  authorize("client"),
  jobIdValidation,
  validate,
  JobController.deleteJob
);

router.get(
  "/my-jobs",
  authenticate,
  authorize("client"),
  JobController.getMyJobs
);

router.get(
  "/search",
  searchRateLimiter,
  searchJobValidation,
  validate,
  JobController.searchJobs
);

router.get(
  "/filter",
  filterJobsValidation,
  validate,
  JobController.filterJobs
);

router.get(
  "/:id",
  jobIdValidation,
  validate,
  JobController.getJob
);

router.get(
  "/",
  optionalAuthenticate,
  JobController.getAllJobs
);

export default router;