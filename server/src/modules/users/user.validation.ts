import { body } from "express-validator";

export const updateProfileValidation = [
  body("fullName")
    .optional()
    .isLength({ min: 3 })
    .withMessage("Full name must be at least 3 characters"),

  body("bio")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters"),

  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Invalid phone number"),

  body("location")
    .optional()
    .isString(),

  body("avatar")
    .optional()
    .isString(),

  body("skills")
    .optional()
    .isArray()
    .withMessage("Skills must be an array"),
];