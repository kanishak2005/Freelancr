import { body } from "express-validator";

export const applyProposalValidation = [
  body("job")
    .notEmpty()
    .withMessage("Job id is required"),

  body("coverLetter")
    .trim()
    .isLength({ min: 20 })
    .withMessage(
      "Cover letter must be at least 20 characters"
    ),

  body("bidAmount")
    .isNumeric()
    .withMessage("Bid amount must be numeric"),

  body("deliveryTime")
    .isNumeric()
    .withMessage("Delivery time must be numeric"),
];