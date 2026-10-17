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