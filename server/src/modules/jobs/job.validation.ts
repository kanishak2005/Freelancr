import { body } from "express-validator";

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
