import { body, param, query } from "express-validator";

export const adminUserIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid user ID"),
];


export const adminJobIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid job ID"),
];


export const updateUserStatusValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid user ID"),

  body("isActive")
    .isBoolean()
    .withMessage("isActive must be true or false"),
];


export const updateUserVerificationValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid user ID"),
];


export const updateJobStatusValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid job ID"),

  body("status")
    .isIn([
      "open",
      "in_progress",
      "completed",
      "cancelled",
    ])
    .withMessage("Invalid job status"),
];


export const adminUsersQueryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be at least 1"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage(
      "Limit must be between 1 and 100"
    ),

  query("role")
    .optional()
    .isIn([
      "client",
      "freelancer",
      "admin",
    ])
    .withMessage("Invalid user role"),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage(
      "isActive must be true or false"
    ),
];


export const adminJobsQueryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be at least 1"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage(
      "Limit must be between 1 and 100"
    ),

  query("status")
    .optional()
    .isIn([
      "open",
      "in_progress",
      "completed",
      "cancelled",
    ])
    .withMessage("Invalid job status"),
];