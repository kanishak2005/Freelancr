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

export const googleAuthValidation = [
  body("credential")
    .notEmpty()
    .withMessage("Google credential is required")
    .isString()
    .withMessage("Google credential must be a valid token string"),

  body("role")
    .optional()
    .isIn(["client", "freelancer"])
    .withMessage("Role must be client or freelancer"),
];

export const sendRegistrationOtpValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
];

export const verifyRegistrationOtpValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("otp")
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .matches(/^\d{6}$/)
    .withMessage("OTP must be numeric"),
];

export const completeRegistrationValidation = [
  body("registrationToken")
    .notEmpty()
    .withMessage("Registration token is required")
    .isString()
    .withMessage("Registration token must be a string"),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  body("role")
    .isIn(["client", "freelancer"])
    .withMessage("Role must be client or freelancer"),
];
