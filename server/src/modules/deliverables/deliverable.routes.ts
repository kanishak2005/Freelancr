import { Router } from "express";
import { DeliverableController } from "./deliverable.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  submitDeliverableValidation,
  deliverableIdParamValidation,
  getDeliverablesByContractValidation,
  approveDeliverableValidation,
  requestChangesValidation,
} from "./deliverable.validation";


const router = Router();

// Submit deliverable via contract nested route under deliverables router
router.post(
  "/contract/:contractId",
  authenticate,
  authorize("freelancer"),
  submitDeliverableValidation,
  validate,
  DeliverableController.submit
);

// List deliverables for contract via contract nested route under deliverables router
router.get(
  "/contract/:contractId",
  authenticate,
  getDeliverablesByContractValidation,
  validate,
  DeliverableController.getByContract
);

// Get single deliverable by ID (contract participants or admin)
router.get(
  "/:id",
  authenticate,
  deliverableIdParamValidation,
  validate,
  DeliverableController.getById
);

// Approve deliverable (client only)
router.post(
  "/:id/approve",
  authenticate,
  authorize("client"),
  approveDeliverableValidation,
  validate,
  DeliverableController.approve
);

// Request changes on deliverable (client only)
router.post(
  "/:id/request-changes",
  authenticate,
  authorize("client"),
  requestChangesValidation,
  validate,
  DeliverableController.requestChanges
);

export default router;

