import { Router } from "express";
import { ProposalController } from "./proposal.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { applyProposalValidation } from "./proposal.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  applyProposalValidation,
  validate,
  ProposalController.apply
);

router.get(
  "/my",
  authenticate,
  ProposalController.getMyProposals
);

router.get(
  "/job/:jobId",
  ProposalController.getJobProposals
);

router.get(
  "/:id",
  ProposalController.getProposal
);

router.patch(
  "/:id",
  authenticate,
  ProposalController.updateProposal
);

router.delete(
  "/:id",
  authenticate,
  ProposalController.withdrawProposal
);

export default router;