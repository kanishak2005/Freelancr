import { Router } from "express";

import { ContractController } from "./contract.controller";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";

import { validate } from "../../middleware/validate.middleware";

import {
  createContractValidation,
  getContractsValidation,
} from "./contract.validation";

import { MilestoneController } from "../milestones/milestone.controller";
import {
  createMilestoneValidation,
  contractIdParamValidation,
} from "../milestones/milestone.validation";
import { DeliverableController } from "../deliverables/deliverable.controller";
import {
  submitDeliverableValidation,
  getDeliverablesByContractValidation,
  approveDeliverableValidation,
  requestChangesValidation,
} from "../deliverables/deliverable.validation";




const router = Router();

router.post(
  "/",
  authenticate,
  authorize("client"),
  createContractValidation,
  validate,
  ContractController.create
);

router.get(
  "/",
  authenticate,
  getContractsValidation,
  validate,
  ContractController.getMine
);

router.get(
  "/:contractId/milestones",
  authenticate,
  contractIdParamValidation,
  validate,
  MilestoneController.getByContract
);

router.post(
  "/:contractId/milestones",
  authenticate,
  authorize("client"),
  createMilestoneValidation,
  validate,
  MilestoneController.create
);

router.get(
  "/:contractId/deliverables",
  authenticate,
  getDeliverablesByContractValidation,
  validate,
  DeliverableController.getByContract
);

router.post(
  "/:contractId/deliverables",
  authenticate,
  authorize("freelancer"),
  submitDeliverableValidation,
  validate,
  DeliverableController.submit
);

router.post(
  "/:contractId/deliverables/:id/approve",
  authenticate,
  authorize("client"),
  approveDeliverableValidation,
  validate,
  DeliverableController.approve
);

router.post(
  "/:contractId/deliverables/:id/request-changes",
  authenticate,
  authorize("client"),
  requestChangesValidation,
  validate,
  DeliverableController.requestChanges
);


router.get(
  "/:id",
  authenticate,
  ContractController.get
);

router.patch(
  "/:id/complete",
  authenticate,
  authorize("client"),
  ContractController.complete
);

router.post(
  "/:id/confirm-completion",
  authenticate,
  authorize("freelancer"),
  ContractController.confirmCompletion
);

router.patch(
  "/:id/cancel",
  authenticate,
  authorize("client", "freelancer"),
  ContractController.cancel
);

router.get(
  "/:id/timeline",
  authenticate,
  ContractController.getTimeline
);

export default router;
