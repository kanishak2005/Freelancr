import { body } from "express-validator";

export const createContractValidation = [
  body("proposalId")
    .notEmpty()
    .withMessage("Proposal ID is required"),
];