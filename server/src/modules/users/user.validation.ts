import { body } from "express-validator";

export const updateProfileValidation = [
  body("fullName")
    .optional()
    .isString()
    .withMessage("Full name must be a string")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Full name must be between 3 and 100 characters"),

  body("bio")
    .optional()
    .isString()
    .withMessage("Bio must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters"),

  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Invalid phone number"),

  body("location")
    .optional()
    .isString()
    .withMessage("Location must be a string")
    .trim()
    .isLength({ max: 150 })
    .withMessage("Location cannot exceed 150 characters"),

  body("avatar")
    .optional()
    .isString()
    .withMessage("Avatar must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Avatar is too long"),

  body("skills")
    .optional()
    .isArray({ max: 30 })
    .withMessage("Skills must be an array with at most 30 items"),

  body("skills.*")
    .optional()
    .isString()
    .withMessage("Each skill must be a string")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each skill must be between 1 and 50 characters"),
];
