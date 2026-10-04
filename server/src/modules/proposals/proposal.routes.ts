import { Router } from "express";
import { ProposalController } from "./proposal.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  applyProposalValidation,
  updateProposalValidation,
} from "./proposal.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("freelancer"),
  applyProposalValidation,
  validate,
  ProposalController.apply
);

router.get(
  "/my",
  authenticate,
  authorize("freelancer"),
  ProposalController.getMyProposals
);

router.get(
  "/job/:jobId",
  authenticate,
  authorize("client", "admin"),
  ProposalController.getJobProposals
);

router.get(
  "/:id",
  authenticate,
  authorize("client", "freelancer", "admin"),
  ProposalController.getProposal
);

router.patch(
  "/:id",
  authenticate,
  authorize("freelancer"),
  updateProposalValidation,
  validate,
  ProposalController.updateProposal
);

router.delete(
  "/:id",
  authenticate,
  authorize("freelancer"),
  ProposalController.withdrawProposal
);

export default router;
