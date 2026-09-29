import { Router } from "express";

import { ContractController } from "./contract.controller";

import { authenticate } from "../../middleware/auth.middleware";

import { validate } from "../../middleware/validate.middleware";

import {
  createContractValidation,
} from "./contract.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  createContractValidation,
  validate,
  ContractController.create
);

router.get(
  "/",
  authenticate,
  ContractController.getMine
);

router.get(
  "/:id",
  authenticate,
  ContractController.get
);

router.patch(
  "/:id/complete",
  authenticate,
  ContractController.complete
);

router.patch(
  "/:id/cancel",
  authenticate,
  ContractController.cancel
);

export default router;