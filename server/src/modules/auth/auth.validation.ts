import { body } from "express-validator";


export const forgotPasswordValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email"),
];

export const resetPasswordValidation = [
  body("token")
    .notEmpty()
    .withMessage("Reset token is required"),

  body("newPassword")
    .isLength({ min: 8 })
    .withMessage(
      "Password must contain at least 8 characters"
    ),
];
export const changePasswordValidation = [
  body("oldPassword")
    .notEmpty()
    .withMessage("Old password is required"),

  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain one number"),
];
export const registerValidation = [
  body("fullName")
    .trim()
    .notEmpty()
    .isLength({ min: 3 }),

  body("email")
    .isEmail()
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 }),

  body("role")
    .isIn(["client", "freelancer"]),
];

export const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail(),

  body("password")
    .notEmpty(),
];