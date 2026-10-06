import { body } from "express-validator";

export const createOrderValidation = [
  body("contract")
    .notEmpty()
    .withMessage("Contract id is required"),
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