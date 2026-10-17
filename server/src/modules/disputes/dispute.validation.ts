import { body, param, query } from "express-validator";

export const openDisputeValidation = [
  body("contractId").isMongoId().withMessage("Invalid contract ID"),
  body("reason")
    .isIn([
      "non_delivery",
      "poor_quality",
      "payment_issue",
      "communication",
      "scope_breach",
      "other",
    ])
    .withMessage("Invalid dispute reason"),
  body("description")
    .isString()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Description must be between 10 and 5000 characters"),
];

export const addEvidenceValidation = [
  param("id").isMongoId().withMessage("Invalid dispute ID"),
  body("url").isURL().withMessage("Valid evidence URL is required"),
  body("publicId").isString().notEmpty().withMessage("Public ID is required"),
  body("name").optional().isString().trim(),
  body("notes").optional().isString().trim().isLength({ max: 1000 }),
];

export const resolveDisputeValidation = [
  param("id").isMongoId().withMessage("Invalid dispute ID"),
  body("status")
    .isIn(["resolved", "rejected", "cancelled"])
    .withMessage("Invalid resolution status"),
  body("resolution")
    .optional()
    .isIn(["refund_client", "release_freelancer", "split", "dismissed"])
    .withMessage("Invalid resolution type"),
  body("resolutionNotes")
    .isString()
    .trim()
    .isLength({ min: 5, max: 3000 })
    .withMessage("Resolution notes must be between 5 and 3000 characters"),
];

export const disputeIdValidation = [
  param("id").isMongoId().withMessage("Invalid dispute ID"),
];
