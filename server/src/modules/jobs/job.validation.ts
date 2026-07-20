import { body } from "express-validator";

export const createJobValidation = [
  body("title")
    .trim()
    .isLength({ min: 5 })
    .withMessage("Title must be at least 5 characters"),

  body("description")
    .trim()
    .isLength({ min: 20 })
    .withMessage("Description must be at least 20 characters"),

  body("category")
    .notEmpty()
    .withMessage("Category is required"),

  body("budget")
    .isNumeric()
    .withMessage("Budget must be a number"),

  body("budgetType")
    .isIn(["fixed", "hourly"])
    .withMessage("Invalid budget type"),

  body("experienceLevel")
    .isIn(["entry", "intermediate", "expert"])
    .withMessage("Invalid experience level"),
];

export const updateJobValidation = [
  body("title").optional(),
  body("description").optional(),
  body("category").optional(),
  body("budget").optional().isNumeric(),
];