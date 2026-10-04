import { body } from "express-validator";

export const applyProposalValidation = [
  body("job")
    .isMongoId()
    .withMessage("Valid job id is required"),

  body("coverLetter")
    .trim()
    .isLength({ min: 20 })
    .withMessage(
      "Cover letter must be at least 20 characters"
    ),

  body("bidAmount")
    .isNumeric()
    .withMessage("Bid amount must be numeric")
    .custom((value) => Number(value) > 0)
    .withMessage("Bid amount must be greater than 0"),

  body("deliveryTime")
    .isNumeric()
    .withMessage("Delivery time must be numeric")
    .custom((value) => Number(value) > 0)
    .withMessage("Delivery time must be greater than 0"),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array"),

  body("attachments.*")
    .optional()
    .isString()
    .withMessage("Each attachment must be a string"),
];

export const updateProposalValidation = [
  body("coverLetter")
    .optional()
    .trim()
    .isLength({ min: 20 })
    .withMessage(
      "Cover letter must be at least 20 characters"
    ),

  body("bidAmount")
    .optional()
    .isNumeric()
    .withMessage("Bid amount must be numeric")
    .custom((value) => Number(value) > 0)
    .withMessage("Bid amount must be greater than 0"),

  body("deliveryTime")
    .optional()
    .isNumeric()
    .withMessage("Delivery time must be numeric")
    .custom((value) => Number(value) > 0)
    .withMessage("Delivery time must be greater than 0"),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array"),

  body("attachments.*")
    .optional()
    .isString()
    .withMessage("Each attachment must be a string"),
];
