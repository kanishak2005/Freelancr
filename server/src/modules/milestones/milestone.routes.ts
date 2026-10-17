import { Router } from "express";
import { MilestoneController } from "./milestone.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  createMilestoneValidation,
  updateMilestoneValidation,
  milestoneIdValidation,
  contractIdParamValidation,
} from "./milestone.validation";

const router = Router();

// Create milestone (Client only)
router.post(
  "/",
  authenticate,
  authorize("client"),
  createMilestoneValidation,
  validate,
  MilestoneController.create
);

// Create milestone via contract nested path (Client only)
router.post(
  "/contract/:contractId",
  authenticate,
  authorize("client"),
  createMilestoneValidation,
  validate,
  MilestoneController.create
);

// List milestones for contract (Participants or Admin)
router.get(
  "/contract/:contractId",
  authenticate,
  contractIdParamValidation,
  validate,
  MilestoneController.getByContract
);

// Get single milestone details (Participants or Admin)
router.get(
  "/:id",
  authenticate,
  milestoneIdValidation,
  validate,
  MilestoneController.getById
);

// Update milestone in planned state (Client only)
router.patch(
  "/:id",
  authenticate,
  authorize("client"),
  milestoneIdValidation,
  updateMilestoneValidation,
  validate,
  MilestoneController.updatePlanned
);

// Cancel milestone and release allocation (Client only)
router.post(
  "/:id/cancel",
  authenticate,
  authorize("client"),
  milestoneIdValidation,
  validate,
  MilestoneController.cancel
);

export default router;
