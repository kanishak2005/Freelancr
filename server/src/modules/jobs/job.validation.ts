import { body, param, query } from "express-validator";

export const jobIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid job ID"),
];

export const searchJobValidation = [
  query("keyword")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search keyword must not exceed 100 characters"),
];

export const filterJobsValidation = [
  query("category")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 }),

  query("budgetType")
    .optional()
    .isIn(["fixed", "hourly"])
    .withMessage("Invalid budget type"),

  query("experienceLevel")
    .optional()
    .isIn(["entry", "intermediate", "expert"])
    .withMessage("Invalid experience level"),

  query("status")
    .optional()
    .isIn(["open", "in_progress", "completed", "cancelled"])
    .withMessage("Invalid status"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be at least 1"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

export const createJobValidation = [
  body("title")
    .trim()
    .isLength({ min: 5, max: 150 })
    .withMessage("Title must be between 5 and 150 characters"),

  body("description")
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage(
      "Description must be between 20 and 5000 characters"
    ),

  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required"),

  body("budget")
    .isFloat({ min: 1 })
    .withMessage("Budget must be greater than 0"),

  body("budgetType")
    .isIn(["fixed", "hourly"])
    .withMessage("Invalid budget type"),

  body("experienceLevel")
    .isIn(["entry", "intermediate", "expert"])
    .withMessage("Invalid experience level"),
];

export const updateJobValidation = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 5, max: 150 })
    .withMessage("Title must be between 5 and 150 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage(
      "Description must be between 20 and 5000 characters"
    ),

  body("category")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category cannot be empty"),

  body("budget")
    .optional()
    .isFloat({ min: 1 })
    .withMessage("Budget must be greater than 0"),
];
