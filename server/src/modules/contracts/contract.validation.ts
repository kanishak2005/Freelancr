import { body } from "express-validator";

export const createContractValidation = [
  body("proposal")
    .notEmpty()
    .withMessage("Proposal id is required"),

  body("startDate")
    .notEmpty()
    .withMessage("Start date is required"),

  body("endDate")
    .notEmpty()
    .withMessage("End date is required"),
];