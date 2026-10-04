import { body } from "express-validator";

export const sendMessageValidation = [
  body("receiver")
    .isMongoId()
    .withMessage("Valid receiver ID is required"),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message cannot be empty")
    .isLength({ max: 2000 })
    .withMessage("Message is too long"),

  body("attachments")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Attachments must be an array with at most 10 items"),

  body("attachments.*")
    .optional()
    .isString()
    .withMessage("Each attachment must be a string"),
];
