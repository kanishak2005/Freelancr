import { body, query } from "express-validator";

export const createContractValidation = [
  body("proposalId")
    .isMongoId()
    .withMessage("Valid proposal ID is required"),
  body("executionMode")
    .optional()
    .isIn(["simple", "milestone"])
    .withMessage("executionMode must be either 'simple' or 'milestone'"),
];

export const getContractsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be at least 1"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(["active", "completed", "cancelled", "disputed"])
    .withMessage("Invalid contract status"),
];
