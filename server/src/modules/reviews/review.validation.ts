import { body } from "express-validator";

export const createReviewValidation = [
  body("contract")
    .notEmpty()
    .withMessage("Contract id is required"),

  body("rating")
    .isInt({
      min: 1,
      max: 5,
    })
    .withMessage(
      "Rating must be between 1 and 5"
    ),

  body("comment")
    .trim()
    .isLength({
      min: 10,
    })
    .withMessage(
      "Comment must be at least 10 characters"
    ),
];


export const updateReviewValidation = [
  body("rating")
    .optional()
    .isInt({
      min: 1,
      max: 5,
    })
    .withMessage(
      "Rating must be between 1 and 5"
    ),

  body("comment")
    .optional()
    .trim()
    .isLength({
      min: 10,
    })
    .withMessage(
      "Comment must be at least 10 characters"
    ),
];