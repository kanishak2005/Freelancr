import { body, param, query } from "express-validator";

export const createNotificationValidation = [
  body("recipient")
    .notEmpty()
    .withMessage("Recipient is required"),

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required"),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required"),

  body("type")
    .trim()
    .notEmpty()
    .withMessage("Notification type is required"),

  body("sender")
    .optional()
    .isMongoId()
    .withMessage("Invalid sender ID"),
];

export const notificationIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid notification ID"),
];

export const notificationQueryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be at least 1"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("isRead")
    .optional()
    .isBoolean()
    .withMessage("isRead must be true or false"),
];