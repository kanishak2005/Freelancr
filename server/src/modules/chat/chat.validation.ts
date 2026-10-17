import { body, param, query } from "express-validator";

export const chatIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid message ID"),
];

export const conversationUserIdValidation = [
  param("userId")
    .isMongoId()
    .withMessage("Invalid user ID"),
  query("cursor")
    .optional()
    .isMongoId()
    .withMessage("Invalid cursor format"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

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
