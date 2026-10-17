import { Router } from "express";
import { DisputeController } from "./dispute.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  openDisputeValidation,
  addEvidenceValidation,
  resolveDisputeValidation,
  disputeIdValidation,
} from "./dispute.validation";

const router = Router();

router.use(authenticate);

// Participant routes
router.post("/", openDisputeValidation, validate, DisputeController.openDispute);
router.get("/my-disputes", DisputeController.getMyDisputes);
router.get("/:id", disputeIdValidation, validate, DisputeController.getDisputeById);
router.post("/:id/evidence", addEvidenceValidation, validate, DisputeController.addEvidence);

// Admin routes
router.get("/admin/all", authorize("admin"), DisputeController.getAllDisputes);
router.patch(
  "/admin/:id/resolve",
  authorize("admin"),
  resolveDisputeValidation,
  validate,
  DisputeController.resolveDispute
);

export default router;
