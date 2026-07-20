import { body } from "express-validator";

export const sendMessageValidation = [
  body("receiver")
    .notEmpty()
    .withMessage("Receiver is required"),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message cannot be empty")
    .isLength({ max: 2000 })
    .withMessage("Message is too long"),
];