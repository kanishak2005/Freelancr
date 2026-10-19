import { body, param } from "express-validator";

export const paymentIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid payment ID"),
];

export const createOrderValidation = [
  body("contract")
    .isMongoId()
    .withMessage("Valid contract ID is required"),
];

export const verifyPaymentValidation = [
  body("razorpay_order_id")
    .notEmpty()
    .withMessage("Order id is required"),

  body("razorpay_payment_id")
    .notEmpty()
    .withMessage("Payment id is required"),

  body("razorpay_signature")
    .notEmpty()
    .withMessage("Signature is required"),
];

export const refundValidation = [
  body("amount")
    .optional()
    .isNumeric()
    .withMessage("Refund amount must be a number")
    .custom((value) => Number(value) > 0)
    .withMessage("Refund amount must be greater than 0"),
];

export const payoutIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid payout ID"),
];

export const payoutEligibilityValidation = [
  param("contractId")
    .isMongoId()
    .withMessage("Invalid contract ID"),
];

export const requestCashoutValidation = [
  body("amount")
    .notEmpty()
    .withMessage("Cashout amount is required")
    .isNumeric()
    .withMessage("Cashout amount must be a number")
    .custom((value) => {
      const num = Number(value);
      if (isNaN(num) || !isFinite(num) || num <= 0) {
        throw new Error("Cashout amount must be greater than zero");
      }
      if (num < 1) {
        throw new Error("Minimum cashout amount is ₹1.00");
      }
      return true;
    }),
  body("beneficiaryNotes")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Beneficiary notes must not exceed 500 characters"),
];

export const cashoutRequestIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid cashout request ID"),
];

export const rejectCashoutValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid cashout request ID"),
  body("reason")
    .notEmpty()
    .withMessage("Rejection reason is required")
    .isString()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage("Rejection reason must be between 3 and 500 characters"),
];