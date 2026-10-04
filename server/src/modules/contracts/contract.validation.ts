import { body } from "express-validator";

export const createContractValidation = [
  body("proposalId")
    .isMongoId()
    .withMessage("Valid proposal ID is required"),
];
